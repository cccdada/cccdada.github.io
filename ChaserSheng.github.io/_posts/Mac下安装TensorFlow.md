---
layout:     post
title:      Mac下安装TensorFlow
subtitle:   小白学习人工智能
date:       2017-09-20
author:     BY
header-img: img/post-bg-ios9-web.jpg
catalog: true
tags:
    - iOS
    - ReactiveCocoa
    - 函数式编程
    - 开源框架
---

![人工智能.jpg](http://upload-images.jianshu.io/upload_images/1557300-1f08dda438857f15.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

人工智能和机器学习现在已经成为老幼皆知的科学名词了，这要归功于谷歌、facebook等等这类大公司不遗余力的推广，比如谷歌甚至把压箱底的秘籍TensorFlow给开源出来，这流行程度可以称之为人工智能下的Android也不为过。谷歌这一做法其实和开源Android类似，说大了去是造福全人类，帮助中小型公司做出自己的智能产品，自私点说其实是在布局人工职能，建立起一套标准，争夺未来话语权。不管目的如何，只要是有利于社会进步的都是好的。这不我这种小白也开始了自己的人工智能学习之路。
[TensorFlow官方安装地址](https://tensorflow.google.cn/install/install_mac)
我这里根据官方文档重走一遍TensorFlow的安装过程，相应的步骤做下简单的翻译。学习人工智能之前最好具备一些python的相关知识：这里推荐学习[廖雪峰的python教程](https://www.liaoxuefeng.com/wiki/0014316089557264a6b348958f449949df42a6d3a2e542c000)，2.7版本教程在网页右上角切换。
### 安装教程:
####1.打开一个shell终端
#### 2.安装pip和virtualenv
> $ sudo easy_install pip
> $ sudo pip install --upgrade virtualenv
#### 3.执行任一以下命令创建虚拟环境
targetDirectory是你创建的目录
for Python 2.7
> $ virtualenv --system-site-packages targetDirectory 

for Python 3.n
> $ virtualenv --system-site-packages -p python3 targetDirectory
 
假使targetDirectory 是 ~/tensorflow，实际是你自己创建的文件夹的路径
#### 4.执行任一以下命令激活TensorFlow
> $ source ~/tensorflow/bin/activate # If using bash, sh, ksh, or zsh 
> $ source ~/tensorflow/bin/activate.csh # If using csh or tcsh
#### 5. 如果安装了pip 8.1 或者更新的版本，执行以下任一命令在激活的虚拟环境中安装 TensorFlow 及其所有依赖
> $ pip install --upgrade tensorflow # for Python 2.7 
$ pip3 install --upgrade tensorflow # for Python 3.n
#### 6.验证你的安装是否正确
每打开一个新的 shell 使用 TensorFlow 都必须激活虚拟环境。如果当前虚拟环境没有被激活（也就是提示符不是 tensorflow），执行以下任一命令：
> $ source ~/tensorflow/bin/activate      # bash, sh, ksh, or zsh
$ source ~/tensorflow/bin/activate.csh  # csh or tcsh 

当你的提示符变成下面这样说明 tensorflow 环境已经激活：
> (tensorflow)$ 

退出环境:
> (tensorflow)$ deactivate 

卸载TensorFlow
> $ rm -r ~/tensorflow 

好了，TensorFlow我们就安装成功了，如果有什么问题可以仔细查阅官方的安装教程。
************9月20日更新************

![tensor_w.png](http://upload-images.jianshu.io/upload_images/1557300-cb01b2ddb105f74a.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
在你编译的时候会有上面的警告，具体的[解决办法](http://www.hankcs.com/ml/compile-and-install-tensorflow-from-source.html)