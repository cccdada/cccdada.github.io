---
layout:     post
title:      android实现一行命令打包上传
published:  true
subtitle:   实用技巧
date:       2017-11-20
author:     ChaserSheng
header-img: img/post-bg-android.jpg
catalog: true
tags:
    - android
    - python
    - 实用开发技巧
    - 打包测试
---

#### 前言

测试是我们开发中不可缺少的一个环节，我们一般都会有自己的测试环境，我们的测试apk可能会放在我们的内网上，也可能会放在三方测试平台，比如fir.im、蒲公英等等，但是有时会出现没有合适的位置访问安装包，又考虑三方平台的安全性问题，这时就尴尬了，这篇文章就是讲的如何去解决这一麻烦。

#### 关于python脚本

脚本在后端开发中很常见，比如发版上线、跑批量等等，但是在移动端开发中显得没有那么重要了，但是脚本在一些方面是很方便的。Gradle的打包过程可以认为是脚本，自动化测试也可以理解为脚本，在一些场景中我们可以吧一些重复的工作交给脚本来做。

#### 常见的场景－－打包交付测试

在平时的开发中，我们可能需要打包给测试人员，传统的方式是usb线运行adb命令给每个测试打新包，这个过程除了和测试的沟通外，还得测试机一个个连接电脑，显然，每个移动端开发都不希望做这些重复累赘的工作，那怎么来解决这个问题呢？很多公司可能都有这么一个测试平台的地址，我们打包的测试包都会放在这个测试平台上，每次新版本发布后，测试人员用测试机从上面下载下来安装测试，这是常见的解决方案。但是打包上传流程，还得手动去做，一个好的程序猿，一定是个“懒”程序猿，所以我们来尝试省去手动上传的这个步骤。

####  利用python实现一句命令打包上传测试

我们来分析上面的这个场景，首先：我们使用AndroidStudio打包测试apk；其次：打包好的apk需要放置在我们的测试平台上；最后：测试人员在手机浏览器输入apk的地址下载安装apk。对于第一条，这个我们使用gradle的task比如```assembleDebug```去完成，第二条，我们需要知道测试平台的地址、账号、相关目录等，这里我本地起一个apache的服务来模拟这么个场景，你在平时开发中也可以这么做，我用的mac，起apache的命令是```sudo apachectl start```，我们把apk拷贝到apache的一个固定目录下，最后测试人员输入这个地址就可以访问到了，当然都必须在同一局域网内。

按照上面的流程我们一步步来做：我们知道AndroidStudio的打包是依赖gradle的，gradle运行不同的task去实现打不同的包，我们自定义一个task

```
task debugApkToWeb{
    dependsOn 'assemble开发Debug'
}
```

这个task是包裹在```android {}```中的，关于gradle的介绍可以去看网上的分享，这里就不展开了。

python代码部分，比较简单

```
import os
import shutil

//获取该目录下的文件列表
alllist = os.listdir("/Users/xxx/AndroidStudioProjects/Android/app/build/outputs/apk/")
//遍历
for i in alllist:
     //如果文件是以apk结尾继续
     if (i.endswith(".apk")):
        //分割文件名和文件后缀
        aa,bb = i.split(".")
        //旧文件
        oldname = "/Users/xxx/AndroidStudioProjects/Android/app/build/outputs/apk/"+aa+"."+bb
        //新文件
        newname = "/Library/WebServer/Documents/"+aa+"."+bb
        //拷贝
        shutil.copyfile(oldname,newname)
        //打印
        print aa
```

10行代码完成文件拷贝，不要太爽

拷贝完成，我们的任务就算是结束了，告诉测试人员新版发布完成就可以了。不要太爽啊，哈哈哈。

我们把gradle的task补充完整：

```
task debugApkToWeb(type: Exec){
        dependsOn 'assembleDebug'
        commandLine "./gradlew","clean"
        commandLine "sudo","python","/Users/xxx/AndroidStudioProjects/Android/copyApkToApacheDocument.py"
}
```

使用方法，Terminal切换项目根目录，运行命令：

```./gradlew debugApkToWeb```

#### 后续

这里还有一个小技巧，我们的各种环境打出不同的包，为了方便识别，我们可以定制不同的logo，logo上写上不同的字就可以了。然后我们在app的build.gradle中使用

```
manifestPlaceholders = [app_icon: "@mipmap/ic_launcher_xxx",
                                    app_name: "xxx"]
```

manifest的application中

```
<application
        android:name=".xxx"
        android:icon="${app_icon}"
        android:label="${app_name}">
```

如果想安装多个app，flavor中的每个product可以加上

```
applicationIdSuffix ".xxx"
```

如果适配了安卓7.0，安卓app的时候可能出现报错：安装应用出现重复的内容提供者，这是因为我们的manifest中的```<provider/>```标签的```android:authorities```相同，改成当前的包名就可以了。

