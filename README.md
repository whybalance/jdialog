jQuery-dialog 0.1.0
这是一个简单好用的jQueryDialog效果.
=======
####Demo : http://jsbin.com/eqacij/9/

##依赖
jquey-1.9.1 (老版本我没试过 估计1.7+应该都可以.)
         
##调用方式:
####加载CSS文件和JS文件后:
    <script>
    var dialog = $.jdialog.create(content,name).show();
    /*
      content 是字符串内容可以是HTML
      name 是对象标识,当丢失对象句柄的时候可以用标识重新获得
    */
    <script>
    
##实例接口:
    show() 显示
    hide() 隐藏
    html(content) 重置内容
    reset() 重置内容
    
##主对象接口:
    $.jdialog.create(content,name); 创建一个新的dialog
    $.get(name); 根据name标识重新获得实例对象
