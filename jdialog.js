/*
 bug :
 //1. 应该先渲染背景和菜单 然后在渲染纸张文字尺寸 然后再渲染文字
 2. 文字和纸张颜色应通过动态创建Class完成
 3. 构建书页应异步逐步创建避免浏览器卡死
*/
(function($, window, undefined) {
    'use strict';
    //节点缓存
    var _body = $(document.body);
    var _reader;
    var _canvas;
    var _nav;
    //纸张缓存栈
    var _papers = [];
    //动作缓存
    var _actions = {};
    //URL缓存
    var _domain;
    var _static;
    var _data;
    //节点列表
    var _nodes;
    //阅读器默认配置
    var _config;
    //文字规格
    var _fonts;
    //阅读模式列表
    var _models;
    //阅读器皮肤列表
    var _themes;
    //导航数据
    var _navData;
    //重置导航位置
    var _resetNav = function() {
        var paper = $('.paper', _canvas);
        if (paper.length) {
            var offset = paper.offset();
            var position = $(window).width() - offset.left - paper.width() - _nav.innerWidth();
            if (position < 30) {
                position = 30;
            }
            var style = '#nav{right:' + position + 'px}';
            $.jstyle.write(style, 'NavOffset');
            _nav.show();
        }
    };
    //绑定导航事件
    var _navEvent = function() {
        _nav.on('mouseenter', '.link', function() {
            var el = $(this);
            var id = el.attr('data-id');
            var data = _navData[id];
            if (data) {
                el.css('background-position-y', data.height || 32);
            }
        }).on('mouseleave', '.link', function() {
            $(this).css('background-position-y', 0);
        }).on('click', '.link', function() {
            var el = $(this);
            var id = el.attr('data-id');
            var data = _navData[id];
            var action = _actions[id];
            if (action) {
                action.execute(el, data);
            } else {
                //显示loading
                _ccr.loading();
                //加载功能脚本
                $.ajax({
                    dataType: "script",
                    cache: true,
                    url: _static + 'js/nav.min.js?_=' + _ccr.version
                }).done(function() {
                    action = _actions[id];
                    if (action) {
                        _actions[id].execute(el, data);
                    }
                    //隐藏loading
                    clearTimeout(_ccr.loadingTimer);
                    $.jmessage.get('loading').hide();
                });
            }
        });
    };
    //创建纸张
    var _createPaper = function(id, data) {
        //建立纸张DOM结构
        var paper = $($.doT.render('tmpl-paper', $.extend({
            'id': _nodes.paper.substring(1),
            'paperID': id + 1
        }, data))).appendTo(_canvas);
        //添加到纸张列表
        _papers[id] = paper;
        //获取内容句柄
        return $('.paper-content', paper);
    };
    //处理文本
    var _proces = function(text) {

        return text.replace(/^(\s|[\u3000])+/, '').replace(/(\s|[\u3000])+$/, '');
    };
    //推迟处理页面内容
    var _timer;
    var _deferred = function(action, options) {
        _timer = setTimeout(function() {
            if ($.isFunction(action)) {
                action(options);
            }
        }, _ccr.storage.model.timer);
    };
    //设置网页标题
    var _setTitle = function(data) {
        document.title = data.title + '_' + data.book + '_云中书城';
        return _ccr;
    };

    var _savescroll;
    var _startSaveScrll = function() {
        var save = $.jStorage.get('savescroll');
        if (save && save.chapter === _ccr.chapters.current) {
            $('html,body').scrollTop(save.scrll);
        }
        $(window).scroll(function() {
            clearTimeout(_savescroll);
            _savescroll = setTimeout(function() {
                $.jStorage.set('savescroll', {
                    'chapter': _ccr.chapters.current,
                    'scrll': (document.body.scrollTop || document.documentElement.scrollTop)
                });
            }, 100);
        });
    };

    var _ccr = $.CloudCityReader = {
        //version
        version: window['version'] || '20130501',
        //用户信息
        user: {},
        //书籍信息
        book: {},
        //动作集合
        actions: _actions,
        //是否移动设备
        isMobile: "ontouchstart" in document.documentElement,
        //初始化阅读器
        init: function(options) {
            this.options = options = $.extend({
                'deferred': $.Deferred()
            }, options);
            //缓存URL
            _domain = options.domainServer;
            _static = options.staticServer;
            _data = options.dataServer;
            //缓存配置
            _nodes = options.nodes;
            _config = options.defauleConfig;
            _fonts = options.fonts;
            _models = options.models;
            _themes = options.themes;
            _navData = options.navData;
            //抓取主要节点
            _reader = $(_nodes.reader);
            _nav = $(_nodes.nav, _reader);
            _canvas = $(_nodes.canvas, _reader);
            //初始化渲染
            var chapter = location.hash.substring(1);
            _ccr.load().setFont().setModel().setTheme().getChapter(chapter).done(function(data) {
                _setTitle(data).chapters.current = data.current;
                _ccr.setContent().done(function() {
                    _resetNav();
                    _navEvent();
                    _startSaveScrll();
                    _ccr.getUser().preloadChapter();
                    options.deferred.resolve();
                });
            });
            return $.when(options.deferred);
        },
        //打开书籍相关地址
        open: function(url, params) {
            var current = _ccr.chapters.current;
            var bookid = current.substring(0, current.lastIndexOf('/'));
            params = params || '';
            window.open(url + bookid + params);
        },
        //跳转到书籍相关地址
        goto: function(url, params) {
            var current = _ccr.chapters.current;
            var bookid = current.substring(0, current.lastIndexOf('/'));
            params = params || '';
            location.href = url + bookid + params;
        },
        //延迟显示加载框
        loading: function() {
            clearTimeout(_ccr.loadingTimer);
            _ccr.loadingTimer = setTimeout(function() {
                $.jmessage.get('loading').show();
            }, 500);
            return _ccr;
        },
        //消息日至
        log: function(message) {
            $.jmessage.create().show({
                content: message,
                timer: 3000,
                fixed: true
            });
        },
        //加载数据
        load: function(options) {
            options = $.extend(_config, options);
            //还原缓存
            _ccr.storage = $.jStorage.get('ccr');
            if (_ccr.storage === null) {
                _ccr.storage = options;
            }
            _ccr.chapters = $.jStorage.get('chapters');
            if (_ccr.chapters === null) {
                _ccr.chapters = {};
            }
            return _ccr.save();
        },
        //保存数据
        save: function() {
            $.jStorage.set('ccr', _ccr.storage);
            //$.jStorage.set('chapters', _ccr.chapters);
            return _ccr;
        },
        //获取用户信息
        getUser: function() {
            $.getJSON(_domain + '/api_reader/get_userinfo/', function(data) {
                var user = $('.user-link');
                user.html('<img src="' + data.FACEIMAGES50 + '" style="width:32px; height:32px; border:0 solid #fff;" />');
            });
            return _ccr;
        },
        addShelf: function() {
            var current = _ccr.chapters.current.split('/');
            var rpid = current[0];
            var bookid = current[1];
            $.get(_domain + '/shelf/ajax_add_shelf', {
                'rpid': rpid,
                'bookid': bookid
            }, function(txt) {
                switch (txt) {
                    case '-2':
                        _ccr.log('您还没登录,加入云书架需要登录才能使用.');
                        break;
                    case '-1':
                        _ccr.log('可能是网络不稳定或者你的人品不好,加入云书架失败了.');
                        break;
                    case '1':
                        _ccr.log('您成功的将本书加入了云书架.');
                        break;
                    case '2':
                        _ccr.log('这本书已经在您的云书架里了,你还想闹哪样?');
                        break;
                    case '3':
                        _ccr.log('NONONO!你今天已经加入了一百本啊一百本!!!');
                        break;
                }
            });
            return _ccr;
        },
        //加载文章列表
        getCatalogue: function() {
            var deferred = $.Deferred();
            var current = _ccr.chapters.current;
            var chapter = _ccr.chapters[current];
            _ccr.book.id = current.substring(0, current.lastIndexOf('/'));
            _ccr.book.name = chapter.book;
            _ccr.book.author = chapter.authorname;
            if (_ccr.book[_ccr.book.id] === undefined) {
                $.getJSON(_domain + '/api_reader/get_chapters/' + _ccr.book.id, function(data) {
                    if (data.content === '') {
                        _ccr.log('无法读取目录内容,请检查网络设置.');
                    } else {
                        _ccr.book[_ccr.book.id] = data;
                    }
                    deferred.resolve(_ccr.book);
                });
            } else {
                deferred.resolve(_ccr.book);
            }
            return $.when(deferred);
        },
        //加载文章内容
        getChapter: function(chapter) {
            //加载章节数据
            var deferred = $.Deferred();
            var data = _ccr.chapters[chapter];
            if (data === undefined) {
                $.getJSON(_domain + '/api_reader/get_chaptercontent/' + chapter, function(data) {
                    if (data.content === '') {
                        _ccr.log('无法读取章节内容,请检查网络设置.');
                    } else {
                        _ccr.chapters[chapter] = data;
                    }
                    deferred.resolve(data);
                });
            } else {
                deferred.resolve(data);
            }
            return $.when(deferred);
        },
        prve: function() {
            var current = _ccr.chapters.current;
            var chapter = _ccr.chapters[current];
            if (chapter) {
                var prve = chapter.prve;
                if (prve) {
                    _ccr.getChapter(prve).done(function() {
                        _ccr.loading();
                        location.hash = prve;
                    });
                } else {
                    _ccr.log('没有上一章了.');
                }
            }
            return _ccr;
        },
        next: function() {
            var current = _ccr.chapters.current;
            var chapter = _ccr.chapters[current];
            if (chapter) {
                var next = chapter.next;
                if (next) {
                    _ccr.getChapter(next).done(function() {
                        _ccr.loading();
                        location.hash = next;
                    });
                } else {
                    _ccr.log('没有下一章了.');
                }
            }
            return _ccr;
        },
        //预载
        preload: 1,
        preloadThread: 0,
        preloadChapter: function(data, preload, thread) {
            data = data || _ccr.chapters[_ccr.chapters.current];
            if (data) {
                var over = false;
                if (!$.isNumeric(preload)) {
                    preload = _ccr.preload;
                    thread = ++_ccr.preloadThread;
                    $.jmessage.create({
                        'content': '正在预载后面的章节...',
                        'horizontal': 'right',
                        'vertical': 'bottom',
                        'fixed': true
                    }, 'preload');
                    clearTimeout(_ccr.preloadTimer);
                    _ccr.preloadTimer = setTimeout(function() {
                        $.jmessage.get('preload').show();
                    }, 500);
                }
                if (thread !== _ccr.preloadThread) {
                    //进行了新的预载线程 
                    return _ccr;
                }
                //判断是否预载下一章
                if (preload > 0) {
                    if (data.next) {
                        _ccr.getChapter(data.next).done(function(data) {
                            _ccr.preloadChapter(data, --preload, thread);
                        });
                    } else {
                        over = true;
                    }
                } else {
                    over = true;
                }
                //结束
                if (over) {
                    _ccr.save();
                    clearTimeout(_ccr.preloadTimer);
                    $.jmessage.get('preload').hide();
                }
            }
            return _ccr;
        },
        //设置文字
        setFont: function(options) {
            options = $.extend($.extend({}, _ccr.storage.font), options);
            var font = _fonts[options.fontSize];
            if (font) {
                var fontSize = font.fontSize;
                var lineHeight = font.lineHeight[options.lineHeight].value;
                $.jstyle.write('#reader .paper-content{' +
                    'font-size:' + fontSize + 'px;' +
                    'line-height:' + lineHeight + 'px;' +
                    'text-indent:' + options.textIndent + 'em;' +
                    'text-align:' + options.textAlign + ';' +
                    'word-break:' + options.wordBreak + ';' +
                    '}', 'Fonts');
            }
            _ccr.storage.font = options;
            return _ccr;
        },
        //设置阅读模式
        setModel: function(name) {
            var modelName = name || _ccr.storage.model.current;
            var modelData = _models[modelName];
            if (modelData) {
                //计算宽高单位
                var widthUnit = '',
                    heightUnit = '';
                if ($.isNumeric(modelData.width)) {
                    widthUnit = 'px';
                }
                if ($.isNumeric(modelData.height)) {
                    heightUnit = 'px';
                }
                var style = _nodes.reader + '{width:' + modelData.width + widthUnit + '}' + _nodes.reader + ' ' + _nodes.paper + '-content{height:' + modelData.height + heightUnit + '}';
                $.jstyle.write(modelData.style + style, 'Models');
                _ccr.storage.model.current = modelName;
            }
            _resetNav();
            return _ccr;
        },
        //设置皮肤
        setTheme: function(name) {
            var themeName = name || _ccr.storage.theme.current;
            var themeData = _themes[themeName];
            if (themeData) {
                $.jstyle.write(themeData.style, 'Themes');
                _ccr.storage.theme.current = themeName;
            }
            return _ccr;
        }, //重置书页
        setContent: function(options) {
            options = $.extend({
                'discon': _ccr.storage.model.discon,
                'chapterID': _ccr.chapters.current,
                'paperID': 0,
                'pID': 0,
                'point': 0,
                'deferred': $.Deferred()
            }, options);

            var chapter = _ccr.chapters[options.chapterID];
            //如果找到章节内容
            if (chapter) {
                //如果返回的是字符串URL(非数组)
                if (!$.isArray(chapter.content)) {
                    return location.replace(chapter.content);
                }
                //从头开始
                if (options.paperID === 0) {
                    clearTimeout(_timer);
                    _papers = [];
                    _canvas.html('');
                }
                //混排设置
                //图文混排子节点缓存
                var mixed;
                //混排节点的基线
                var mixedBaseline;
                //是否进行差异化处理断页
                var differentiation = false;
                //图文混排高度偏移
                var shift = 0;
                //高度出现差异的"暴徒"
                var thug;
                //需要调整的边距
                var margin;
                //边距余数
                var remain;

                //段落设置
                //段落高度
                var ph = 0;
                //断点差值
                var point = options.point;
                //初始化纸张
                //建立第一张纸
                var content = _createPaper(options.paperID++, chapter);
                //已处理纸张数
                var paperCount = 1;
                //字体设置
                var font = _ccr.storage.font;
                var lineHeight = _fonts[font.fontSize].lineHeight[font.lineHeight].value;
                //获得当前纸面模型
                var model = _models[_ccr.storage.model.current];
                //是否进行断开纸张处理
                var discon = options.discon && $.isNumeric(model.height);
                //每张纸张的基线位置,超出则建立新的纸张
                var baseline;
                //段落基线
                var paragraphBaseline;
                //当前模式的单页高度
                var height;
                //计算内容精确高度
                var accurate = 'auto';
                if (discon) {
                    //计算单页高度
                    height = Number(model.height);
                    //计算按照行高栅格化后应有的极限高度
                    accurate = height - height % lineHeight;
                    //计算基线高度位置
                    baseline = content.offset().top + accurate;
                }
                //重置纸张内容高度为实质极限高度
                content.height(accurate);
                //渲染内容
                for (var p, i = options.pID, l = chapter.content.length; i < l; i++) {
                    //设置内容
                    p = $('<p class="p p-' + i + '">' + _proces(chapter.content[i]) + '</p>').appendTo(content);
                    //如果需要断纸
                    if (discon) {
                        //简单的处理图文混排造成的问题
                        //获取子节点
                        mixed = p.children();
                        //如果有子节点
                        if (mixed.length) {
                            //每张纸的第一段不能因为图片问题差异化断纸
                            if (content.html() !== '') {
                                //子节点内容的高度超出了本张纸的高度
                                mixedBaseline = mixed.offset().top + mixed.height();
                                if (mixedBaseline >= baseline) {
                                    //则进行差异化断页处理
                                    differentiation = true;
                                    //p.css('display','table');
                                }
                            }
                            //处理由于内容非纯文本造成的高度位移(未验证)
                            shift = p.height() % lineHeight;
                            //如果有余数标识非常规行高
                            if (shift) {
                                //将多余高度计算出来
                                shift = lineHeight - shift;
                                //获得无法平分的1
                                remain = shift % 2;
                                //将多余的高度平分
                                margin = (shift - remain) / 2;
                                //获得需要调整的"暴徒"
                                thug = mixed.eq(0);
                                thug.css({
                                    'margin-top': margin,
                                    //多出来的余数给到底部
                                    'margin-bottom': margin + remain
                                });
                            }
                        }
                        //开始计算断纸
                        ph = p.height();
                        //处理由分纸张造成的断点续接
                        if (point !== 0) {
                            p.css('margin-top', point - ph);
                            //ph = point;
                            point = 0;
                        }
                        //获得段落底部基线
                        paragraphBaseline = p.offset().top + ph;
                        //如果段落底部基线超出或等于纸张基线 或者本段需要差异化断纸
                        if (paragraphBaseline >= baseline || differentiation) {
                            //如果是大于的, 下一张纸还是要从本段开始并且计算超出部分的尾数
                            if (paragraphBaseline > baseline || differentiation) {
                                i--;
                                point = paragraphBaseline - baseline;
                            }
                            //如果进行图文混排差异化断纸处理
                            if (differentiation) {
                                //本段隐藏
                                p.remove();
                                point = 0;
                                differentiation = false;
                            }
                            //如果处理的纸张数量超过线程限制则开启延迟处理余下数据
                            if (paperCount >= _ccr.storage.model.limit) {
                                _deferred(_ccr.setContent, {
                                    'discon': options.discon,
                                    'chapterID': options.chapterID,
                                    'paperID': options.paperID,
                                    'pID': i + 1,
                                    'point': point,
                                    'deferred': options.deferred
                                });
                                return $.when(options.deferred);
                            } else {
                                //否则建立新纸张并重新计算高度和基线位置
                                content = _createPaper(options.paperID++, chapter);
                                content.height(accurate);
                                baseline = content.offset().top + accurate;
                                paperCount++;
                            }
                        }
                    }
                }
            }
            if (options.paperID === 1) {
                $('.paper-id', _canvas).hide();
            }
            options.deferred.resolve();
            return $.when(options.deferred);
        }
    };
    //重置导航位置
    if (_ccr.isMobile) {
        $(window).bind('orientationchange', function() {
            _resetNav();
        });
    } else {
        $(window).resize(function() {
            _resetNav();
        });
    }
    //管理键盘
    var _keyLock = false;
    _body.keydown(function(e) {
        if (_keyLock) {
            return;
        }
        switch (e.keyCode) {
            case 37:
                _ccr.prve();
                break;
            case 39:
                _ccr.next();
                break;
            case 9:
                var top;
                var offset = 20;
                var scroll = (document.body.scrollTop || document.documentElement.scrollTop) + offset;
                var paper = $('.paper');
                for (var i = 0, l = paper.length; i < l; i++) {
                    top = paper.eq(i).offset().top;
                    if (top > scroll) {
                        _keyLock = true;
                        $('html,body').animate({
                            scrollTop: top
                        }, function() {
                            _keyLock = false;
                        });
                        return false;
                    }
                }
                _ccr.next();
                return false;
        }
    });
    //当hash变更的时候
    $(window).bind('hashchange', function() {
        //关闭目录
        var dialog = $.jdialog.get('catalogue');
        if (dialog) {
            dialog.hide();
        }
        //获取数据
        var chapter = location.hash.substring(1);
        _ccr.getChapter(chapter).done(function(data) {
            //如果还没出现loading 就不用再出现了.
            clearTimeout(_ccr.loadingTimer);
            //更改当前章节
            _setTitle(data).chapters.current = data.current;
            _ccr.save().setContent().done(function() {
                //重置滚动条
                $('html,body').scrollTop(0);
                //取消loading
                $.jmessage.get('loading').hide();
                //预载章节
                _ccr.preloadChapter();
            });
        });
    });
}(jQuery, window));
