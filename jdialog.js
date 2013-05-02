(function($, window, document, undefined) {
 'use strict';
	var _body = $(document.body);
	var _screen;
	var _dialogList = {};
	//fuckie6
	var _timer;
	function fixIE6(){
		clearTimeout(_timer);
		_timer = setTimeout(function(){
			$('.jdialog:visible').each(function() {
				var me = $(this);
				me.animate({
					'top': $(window).scrollTop() + ($(window).height() - me.height()) / 2,
					'left': ($(window).width() - me.width()) / 2
				},250);
			});
		}, 250);
	}

	var Dialog = function(content) {
		this.init(content);
	};
	Dialog.prototype = {
		'init': function(content) {
			if (_screen === undefined) {
				_screen = $('<div class="jdialog-screen"></div>').appendTo(_body).mousedown(function(e) {
					e.stopPropagation();
				});
				//fuckie6
				if(_screen.css('position') === 'absolute'){
					_screen.height($(document).height());
					$(window).scroll(fixIE6);
				}
			}
			this.dialog = $('<div class="jdialog"><div class="jdialog-border"></div><div class="jdialog-container"></div></div>').appendTo(_body).mousedown(function(e) {
				e.stopPropagation();
			}).hide();
			this.border = this.dialog.find('.jdialog-border');
			this.container = this.dialog.find('.jdialog-container').html(content);
		},
		'show': function() {
			_screen.show();
			this.dialog.show();
			this.reset();
			return this;
		},
		'hide': function() {
			_screen.hide();
			this.dialog.hide();
			return this;
		},
		'html': function(html) {
			this.container.html(html);
			return this;
		},
		reset: function() {
			var dialog = this.dialog;
			var border = this.border;
			var container = this.container;
			var scroll = 0;
			//fuckie6
			if(dialog.css('position') === 'absolute'){
				scroll = $(window).scrollTop();
			}
			dialog.css({
				'top': ($(window).height() - dialog.height()) / 2 + scroll,
				'left': ($(window).width() - dialog.width()) / 2
			});
			border.css({
				'width': container.outerWidth(),
				'height': container.outerHeight()
			});
			return this;
		}
	};

	$.jdialog = {
		create: function(content, name) {
			name = name || 'default';
			var dialog = _dialogList[name];
			if (dialog === undefined) {
				dialog = _dialogList[name] = new Dialog(content);
			}
			return dialog;
		},
		get: function(name) {
			name = name || 'default';
			return _dialogList[name];
		},
		fix: function() {
			for (var i in _dialogList) {
				_dialogList[i].reset();
			}
		}
	};

	$.fn.dialog = function(name) {
		name = name || 'default';
		return $.jdialog(this, name);
	};
	$(window).resize(function() {
		$.jdialog.fix();
	});
}(jQuery, window, document));
