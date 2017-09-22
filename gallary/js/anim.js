/**
 * Created by wangsheng on 17/9/22.
 */
//通用函数获取id或者class:
function $(selector) {
    var method = selector.substr(0, 1) == "." ? "getElementsByClassName" : "getElementById";
    return document[method](selector.substr(1));
}


//输出所有的数据
function addPhotos() {
    var template = $("#wrap").innerHTML;
    var oHtml = [];
    var nav = [];
    for (var s = 0; s < data.length; s++) {
        var _html = template
            .replace("{{index}}", s)
            .replace("{{img}}", data[s].img)
            .replace("{{caption}}", data[s].caption)
            .replace("{{desc}}", data[s].desc)
        oHtml.push(_html);
        nav.push('<span id="nav_' + s + '" onclick="turn($(\'#photo_ ' + s + ' \'))" class="i">&nbsp</span>')
    }
    oHtml.push('<div class="nav">' + nav.join('') + '</div>');
    $("#wrap").innerHTML = oHtml.join("");
    rsort(random([0, data.length - 1]));
    return (oHtml);
}
addPhotos();


//随机给一张图片添加一个当前样式 ,即居中的photo_center ;
function random(range) {
    var min = Math.min(range[0], range[1]);
    var max = Math.max(range[0], range[1]);
    var diff = max - min;
    var number = Math.ceil(Math.random() * diff + min);
    return number;
}
//计算左右分区的范围 :返回对象: left(最大值 ,最小值) 和right数组
function range() {
    var range = {left: {x: [], y: []}, right: {x: [], y: []}};
    var wrap = {
        w: $("#wrap").clientWidth,
        h: $("#wrap").clientHeight
    }
    var photo = {
        w: $(".photo")[0].clientWidth,
        h: $(".photo")[0].clientHeight
    }
    range.wrap = wrap;
    range.photo = photo;

//            range.left.x = [0-photo.w,wrap.w/2-photo.w/2];
    range.left.x = [0, wrap.w / 2 - photo.w / 2];

    range.left.y = [0 - photo.h, wrap.h];

    range.right.x = [wrap.w / 2 + photo.w / 2, wrap.w + photo.w];
    range.right.y = [0 - photo.h, wrap.h];

    return range;

}


//海报排序, 选出当中图片
function rsort(n) {
    var _photo = $(".photo");
    var photos = [];
    for (i = 0; i < _photo.length; i++) {
        _photo[i].className = _photo[i].className.replace(/\s&*photo_center\s&*/, "");
        _photo[i].className = _photo[i].className.replace(/\s*photo_front\s*/, "");
        _photo[i].className = _photo[i].className.replace(/\s*photo_back\s*/, "");

        _photo[i].className += " photo_front ";
        _photo[i].style.left = "";
        _photo[i].style.top = "";
        _photo[i].style["-webkit-transform"] = 'rotate(360deg) scale(1.3)';
        photos.push(_photo[i]);
    }
    var photo_center = $("#photo_" + n);
    photo_center.className += " photo_center ";

    photo_center = photos.splice(n, 1)[0];

    //把海报分为左右两个部分
    var photos_left = photos.splice(0, Math.ceil(photos.length / 2));
    var photos_right = photos;
//            console.log(photos_right.length);

    var ranges = range();
    console.log(ranges);
    for (var i = 0; i < photos_left.length; i++) {
        photos_left[i].style.left = random(ranges.left.x) + "px";
        photos_left[i].style.top = random(ranges.left.y) + "px";
        photos_left[i].style["-webkit-transform"] = "rotate(" + random([-150, 150]) + "deg) scale(1)";
    }
    for (var i = 0; i < photos_right.length; i++) {
//                console.log(random(ranges.right.x)+ "||" + random(ranges.right.y));

        photos_right[i].style.left = random(ranges.right.x) + "px";
        photos_right[i].style.top = random(ranges.right.y) + "px";
        photos_right[i].style["-webkit-transform"] = "rotate(" + random([-150, 150]) + "deg) scale(1)";

    }
    var navs = $('.i');
    for (var i = 0; i < navs.length; i++) {
        navs[i].className = navs[i].className.replace(/\s*i_current\s*/, " ");
        navs[i].className = navs[i].className.replace(/\s*i_back\s*/, " ")
    }
    navs[n].className += " i_current";
}


function turn(elem) {
    var cls = elem.className;
    var n = elem.id.split("_")[1];
    if (!/photo_center/.test(cls)) {
        return rsort(n);
    }
    if (/photo_front/.test(cls)) {
        cls = cls.replace("photo_front", "photo_back");

        $('#nav_' + n).className += " i_back";
    }
    else {
        cls = cls.replace("photo_back", "photo_front");
        $('#nav_' + n).className = $('#nav_' + n).className.replace(/\s*i_back\S*/, " ");
    }
    return elem.className = cls;
}

//        for(i in odiv){
//            odiv[i].onmouseenter= function(){
//                turn(this);
//            };
//            odiv[i].onmouseleave =function(){
//                turn(this);
//            }
//        }