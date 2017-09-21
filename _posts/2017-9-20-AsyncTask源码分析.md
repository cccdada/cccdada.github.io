---
layout:     post
title:      AsyncTask源码分析
published:  true
subtitle:   源码分析
date:       2017-09-20
author:     ChaserSheng
header-img: img/post-bg-android.jpg
catalog: true
tags:
    - android
    - 源码
    - 开源
    - 系统
---

AsyncTask大家都不会陌生吧，当然现在有比如RxJava这种替代方案，但是AsyncTask我们还是要去分析的，这样我们能更好的理解Android系统是怎样运行的。AsyncTask内部封装了Thread和Handler，简化了他们的使用，我们都知道子线程中是不能更新UI的，我们需要在子线程中计算然后在主线程中更新UI，AsyncTask就提供了这么一种简便的实现方式。
#### 简要说明AsyncTask的重要的一些函数
>* AsyncTask<Params,Progress,Result>定义的三种泛型类型
Params：启动任务执行的输入参数，比如一下下载任务的Url。
Progress：异步任务的执行的百分比。
Result：后台任务执行完成返回的结果，比如下载完成返回文件的path路径。
>* doInBackground()：运行在后台线程，做耗时操作，可以通过 publishProgress()方法更新进度，子线程。
>* onPostExecute()：获取到doInBackground()中的result然后做出处理，比如更新UI，主线程。
>* onProgressUpdate(Progress…)：更新任务进度；
>* onPreExecute()：在调用Excute之前调用，可以显示进度对话框；
>* onCancelled()：用户调用取消时要做的操作。

一个简单的示例，部分伪代码
```
public class ProgressAsyncTask extends AsyncTask<String,Integer,String> {
    @Override
    protected String doInBackground(String... params) {
        //url代表下载地址
        String url = params[0];
        long totalSize = 0;
        long currentSize = 0;
        String filePath="";
        //... URLConnection做下载操作
        totalSize = 1228339;
        //更新 currentSize
        publishProgress(((int) (currentSize / totalSize*100)));
        return filePath;
    }
    @Override
    protected void onProgressUpdate(Integer... values) {
        super.onProgressUpdate(values);
        //progressDialog.setProgress(values[0]);
    }
    @Override
    protected void onPreExecute() {
        super.onPreExecute();
        //showProgressDialog();
    }
    @Override
    protected void onPostExecute(String s) {
        super.onPostExecute(s);
        //showDialog("下载完成，下载地址："+s);
    }
}
```
#### AsyncTask源码分析
```
public abstract class AsyncTask<Params, Progress, Result> {
    private static final String LOG_TAG = "AsyncTask”;
    //cpu核心数	
    private static final int CPU_COUNT = Runtime.getRuntime().availableProcessors();
    //核心线程数的区间是[2,4]
    private static final int CORE_POOL_SIZE = Math.max(2, Math.min(CPU_COUNT - 1, 4));
    //线程池最大容量
    private static final int MAXIMUM_POOL_SIZE = CPU_COUNT * 2 + 1;
    //当一个线程空闲30秒后就会被取消
    private static final int KEEP_ALIVE_SECONDS = 30;
    //线程工厂 通过工厂方法newThread来创建新的线程
    private static final ThreadFactory sThreadFactory = new ThreadFactory() {
	//原子整数 可以在高并发下正常工作
        private final AtomicInteger mCount = new AtomicInteger(1);

        public Thread newThread(Runnable r) {
            return new Thread(r, "AsyncTask #" + mCount.getAndIncrement());
        }
    };

    //静态阻塞式队列，用来存放待执行的任务，初始容量：128个  
    private static final BlockingQueue<Runnable> sPoolWorkQueue =
            new LinkedBlockingQueue<Runnable>(128);

    //静态并发线程池，可以用来并行执行任务，3.0开始，AsyncTask默认是串行执行任务，我们可以构造并行的AsyncTask
    public static final Executor THREAD_POOL_EXECUTOR;
    static {
        ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(
                CORE_POOL_SIZE, MAXIMUM_POOL_SIZE, KEEP_ALIVE_SECONDS, TimeUnit.SECONDS,
                sPoolWorkQueue, sThreadFactory);
        threadPoolExecutor.allowCoreThreadTimeOut(true);
        THREAD_POOL_EXECUTOR = threadPoolExecutor;
    }
    //静态串行的任务执行器，内部实现了线程控制，循环的一个个取出任务交给并发线程池去执行
    public static final Executor SERIAL_EXECUTOR = new SerialExecutor();
    //消息类型 结果
    private static final int MESSAGE_POST_RESULT = 0x1;
    //消息类型 进度
    private static final int MESSAGE_POST_PROGRESS = 0x2;
    //默认的任务执行器，这里使用的是串行的任务执行器，所以AsyncTask是串行的
    private static volatile Executor sDefaultExecutor = SERIAL_EXECUTOR;
    //静态的Handler，AsyncTask必须在UI线程中执行是因为Handler用的是UI线程的Looper，子线程没有Looper
    private static InternalHandler sHandler;

    private final WorkerRunnable<Params, Result> mWorker;
    private final FutureTask<Result> mFuture;

    //任务状态 默认为挂起 标识为易变的volatile
    private volatile Status mStatus = Status.PENDING;
    //原子布尔型 高并发支持 任务是否被取消
    private final AtomicBoolean mCancelled = new AtomicBoolean();
    //任务是否贝执行过
    private final AtomicBoolean mTaskInvoked = new AtomicBoolean();

   //串行的任务执行器，当asyncstask执行的时候会加入到任务队列中一个个执行
    private static class SerialExecutor implements Executor {
      //线性的双向队列 用来存储所有的AsyncTask任务
        final ArrayDeque<Runnable> mTasks = new ArrayDeque<Runnable>();
        //当前正在执行的任务
        Runnable mActive;
        //将新的任务加入到双向队列中
        public synchronized void execute(final Runnable r) {
            mTasks.offer(new Runnable() {
                public void run() {
                    try {
                        //执行任务
                        r.run();
                    } finally {
                        //如果还有任务，则上一个任务执行完毕后执行下一个任务
                        scheduleNext();
                    }
                }
            });
            //当前任务为空 则进入下一个任务
            if (mActive == null) {
                scheduleNext();
            }
        }
        
        //从任务栈的头部取出任务，交给并发线程池执行任务
        protected synchronized void scheduleNext() {
            if ((mActive = mTasks.poll()) != null) {
                THREAD_POOL_EXECUTOR.execute(mActive);
            }
        }
    }

    //任务的状态  等待执行，正在执行，执行完成
    public enum Status {
        PENDING,
        RUNNING,
        FINISHED,
    }

    //同步锁 初始化Handler
    private static Handler getHandler() {
        synchronized (AsyncTask.class) {
            if (sHandler == null) {
                sHandler = new InternalHandler();
            }
            return sHandler;
        }
    }

    /** @hide */
    //隐藏的类 设置默认线程执行器
    public static void setDefaultExecutor(Executor exec) {
        sDefaultExecutor = exec;
    }

   //AsyncTask的构造函数
    public AsyncTask() {
        mWorker = new WorkerRunnable<Params, Result>() {
            public Result call() throws Exception {
                //...
                //result = doInBackground(mParams);
                //...
                return result;
            }
        };

        mFuture = new FutureTask<Result>(mWorker) {
            @Override
            protected void done() {
                //...
            }
        };
    }

    private void postResultIfNotInvoked(Result result) {
        final boolean wasTaskInvoked = mTaskInvoked.get();
        if (!wasTaskInvoked) {
            postResult(result);
        }
    }

    //执行完毕发送消息
    private Result postResult(Result result) {
        @SuppressWarnings("unchecked")
        Message message = getHandler().obtainMessage(MESSAGE_POST_RESULT,
                new AsyncTaskResult<Result>(this, result));
        message.sendToTarget();
        return result;
    }
    //返回当前任务状态
    public final Status getStatus() {
        return mStatus;
    }
    //抽象类  在子线程中执行
    @WorkerThread
    protected abstract Result doInBackground(Params... params);

    //在Execute之前执行 
    @MainThread
    protected void onPreExecute() {
    }

    //任务完毕 返回结果 
    @MainThread
    protected void onPostExecute(Result result) {
    }
    
    //更新任务进度
    @MainThread
    protected void onProgressUpdate(Progress... values) {
    }
    //Cancel被调用并且doInBackground执行完毕，onCancelled被调用，表示任务取消，onPostExecute不会被调用
    @MainThread
    protected void onCancelled(Result result) {
        onCancelled();
    }    
    
    @MainThread
    protected void onCancelled() {
    }

    public final boolean isCancelled() {
        return mCancelled.get();
    }
  
    //取消正在执行的任务
    public final boolean cancel(boolean mayInterruptIfRunning) {
        mCancelled.set(true);
        return mFuture.cancel(mayInterruptIfRunning);
    }

    public final Result get() throws InterruptedException, ExecutionException {
        return mFuture.get();
    }

    //sDefaultExecutor默认串行执行器 如果我们要改成并发的执行方式直接使用executeOnExecutor这个方法
    @MainThread
    public final AsyncTask<Params, Progress, Result> execute(Params... params) {
        return executeOnExecutor(sDefaultExecutor, params);
    }
    //可以指定执行器
    @MainThread
    public final AsyncTask<Params, Progress, Result> executeOnExecutor(Executor exec,
            Params... params) {
        if (mStatus != Status.PENDING) {
            switch (mStatus) {
                case RUNNING:
                    throw new IllegalStateException("Cannot execute task:"
                            + " the task is already running.");
                case FINISHED:
                    throw new IllegalStateException("Cannot execute task:"
                            + " the task has already been executed "
                            + "(a task can be executed only once)");
            }
        }
        mStatus = Status.RUNNING;
        onPreExecute();
        mWorker.mParams = params;
        exec.execute(mFuture);
        return this;
    }

    //更新任务进度  onProgressUpdate会被调用
    @WorkerThread
    protected final void publishProgress(Progress... values) {
        if (!isCancelled()) {
            getHandler().obtainMessage(MESSAGE_POST_PROGRESS,
                    new AsyncTaskResult<Progress>(this, values)).sendToTarget();
        }
    }

    //任务执行完毕  如果没有被取消执行onPostExecute()方法
    private void finish(Result result) {
        if (isCancelled()) {
            onCancelled(result);
        } else {
            onPostExecute(result);
        }
        mStatus = Status.FINISHED;
    }
    //AsyncTask内部Handler
    private static class InternalHandler extends Handler {
        public InternalHandler() {
            super(Looper.getMainLooper());
        }
        @SuppressWarnings({"unchecked", "RawUseOfParameterizedType"})
        @Override
        public void handleMessage(Message msg) {
            AsyncTaskResult<?> result = (AsyncTaskResult<?>) msg.obj;
            switch (msg.what) {
                case MESSAGE_POST_RESULT:
                    // There is only one result
                    result.mTask.finish(result.mData[0]);
                    break;
                case MESSAGE_POST_PROGRESS:
                    result.mTask.onProgressUpdate(result.mData);
                    break;
            }
        }
    }

    private static abstract class WorkerRunnable<Params, Result> implements Callable<Result> {
        Params[] mParams;
    }
    @SuppressWarnings({"RawUseOfParameterizedType"})
    private static class AsyncTaskResult<Data> {
        final AsyncTask mTask;
        final Data[] mData;
        AsyncTaskResult(AsyncTask task, Data... data) {
            mTask = task;
            mData = data;
        }
    }
}
```
好了，源码我们分析完毕，请仔细看注释和重要函数的执行位置。其实梳理了下AsyncTask源码我们发现，它其实是内部封装了Thead和Handler，这样对外暴露一些必要的方法，符合我们六大设计原则中的迪米特原则，也就是最少知识原则，我们在使用的过程中不必关心它的内部实现，只需要在doInBackground()中做计算操作，onProgressUpdate()中更新UI就可以了。

> AsyncTask的一些问题
> * API 16 以前必须在主线程加载 AsyncTask，API 16 以后就不用了;
> * 因为每个AsyncTask只能执行一次，多次调用同一个AsyncTask对象会出现异常。但如果要处理多个后台任务，你需要创建多个AsyncTask并执行execute()；
> * API 4-11 默认是AsnckTask任务并发执行，API11后默认是顺序执行，任务是顺序执行，必须等一个任务结束才能执行下一个。但是可以通过executeOnExecutor（AsyncTask.THREAD_POOL_EXECUTOR）来进行并行执行任务，在并行执行任务时，有最大执行个数的限制
> * AsyncTask需要在UI线程调用execute()函数，因为onPreExecute()在UI线程执行

参考
[任玉刚《Android开发艺术探索》](https://www.amazon.cn/%E5%9B%BE%E4%B9%A6/dp/B014HV1X3K/ref=sr_1_1?s=books&ie=UTF8&qid=1504084507&sr=1-1&keywords=android%E5%BC%80%E5%8F%91%E8%89%BA%E6%9C%AF%E6%8E%A2%E7%B4%A2)
[基于最新版本的AsyncTask源码解读及AsyncTask的黑暗面](http://silencedut.com/2016/07/08/%E5%9F%BA%E4%BA%8E%E6%9C%80%E6%96%B0%E7%89%88%E6%9C%AC%E7%9A%84AsyncTask%E6%BA%90%E7%A0%81%E8%A7%A3%E8%AF%BB%E5%8F%8AAsyncTask%E7%9A%84%E9%BB%91%E6%9A%97%E9%9D%A2/)