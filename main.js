$(function () {
    // portal 初始化
    var portal = new Portal(CONFIG);

    console.log('Portal.version:', Portal.version);

    // 若配置开启通知，则查询通知内容，并根据配置生成通知
    if (CREATER.notice) portal.getNotice({
        alert: CREATER.noticeAlert,
        index: CREATER.noticeIndex,
        time : CREATER.noticeTime
    });

    // 若配置开启视频，则在页面中增加视频
    if (CREATER.video) {
        $('#app .section').append("<div class=\"panel panel-video\"><video class=\"my-video\" src=\"./static/themes/pro/video/video.mp4\" controls autoplay loop muted></video></div>");
    }

    // 若配置开启缴费，则页面中显示缴费按钮
    if (CREATER.usePay) {
        $('#app .section .panel-login .btn-pay').show()
    }

    // 若配置开启查询代拨日志
    if (CREATER.showDialLog) {
        $('#dial-log').show()
    }

    // 显示域名认证按钮
    if (CONFIG.page === 'account') portal.showDomainLoginBtn()

    // 查询用户在线信息
    portal.info({
        params: {
            // 查询用户在线信息请求携带的参数
            // user_name: portal.getCookie('username') || ''
        },
        online: function (res) {
            // Portal 类为 ajax 请求携带请求头的方法
            // portal.setRequestHead({ 'User-Auth' : portal.userInfo.username });

            // AC 多重定向
            // open 模式会弹出新窗口，因为安全原因，会被浏览器默认拦截，需要用户允许
            // href 模式会在本页面重定向，使用时请进行思考，避免出现循环重定向、无法下线等逻辑问题
            portal.acDetect('open');
        },
        offline: function (res) {
            // 断网时先提示恢复流程。真正退出 Verge/Tailscale 和重置网关需要本机辅助脚本配合。
            portal.notify.warning('检测到当前离线，建议先运行网络恢复脚本，再进入认证。');
        }
    });

    if (portal.portalInfo.doub) {
        portal.ajax.jsonp({
            pact: location.protocol,
            host: CONFIG.isIPV6 ? CONFIG.portal.AuthIP : CONFIG.portal.AuthIP6,
            url: '/cgi-bin/rad_user_info',
            success: function (res) {
                if (CONFIG.isIPV6)  portal.userInfo.otherStackIP = res.online_ip  || '';
                if (!CONFIG.isIPV6) portal.userInfo.otherStackIP = res.online_ip6 || '';
                portal.userInfo.username = res.user_name;
                if (CONFIG.portal.DoubleStackOnline) portal.doubPull();
            },
            error: function (res) {
                portal.userInfo.otherStackIP = res.online_ip || '';
                if (CONFIG.portal.DoubleStackOnline) portal.doubPull();
            },
        });
    }

    // 若存在且开启记住密码功能
    if ($('#remember').length && CREATER.remember) {
        // 从 Cookie 中取出记住的账号与密码
        var info = portal.getCookie('remember');
        // 若 Cookie 中存在记住的账号与密码
        if (info) {
            // 克隆自 $.base64，防止污染
            var base64 = portal.clone($.base64);
            // base64 设置 Alpha
            base64.setAlpha('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/');
            info =  JSON.parse(base64.decode(info));
            $('#username').val(info.username);
            $('#password').val(info.password);
            $('#remember').prop('checked', true);
        }
    }

    // 若存在且开启忘记密码功能，且修改密码方式为 Portal 修改
    if ($('#forget').length && CREATER.changeMethod === 'portal') portal.useForget();
    // 若存在且开启充值缴费功能，且页面上有充值缴费按钮
    if ($('.btn-pay').length && CREATER.usePay) portal.usePay();

    var presetUsername = portal.getUrlParams('username') || portal.getUrlParams('user') || '';
    var presetPassword = portal.getUrlParams('password') || portal.getUrlParams('pass') || '';
    if (presetUsername) $('#username').val(decodeURIComponent(presetUsername));
    if (presetPassword) $('#password').val(decodeURIComponent(presetPassword));

    // URL 带账号密码时自动触发登录，避免只填充不认证
    var autoLoginMode = (portal.getUrlParams('autologin') || 'account').toLowerCase();
    if (presetUsername && presetPassword) {
        setTimeout(function () {
            var needCaptcha = $('#captcha').length && $('#captcha').is(':visible') && !$('#captcha').val();
            if (needCaptcha) {
                portal.notify.warning('需要验证码，已预填账号密码，请先输入验证码后登录。');
                return;
            }

            if (autoLoginMode === 'domain') {
                var campusBtn = $('.login-domain[mode="@dx-uestc"]').first();
                if (campusBtn.length) return campusBtn.click();
            }

            if ($('#login-account').length) $('#login-account').click();
        }, 800);
    }

    // 点击验证码图片，刷新验证码图片
    $('#captchaImg').click(function () {
        portal.getCaptcha()
    })

    // 点击登录按钮 - 域名认证
    $('.login-domain').click(function () {
        var mode = $(this).attr('mode');

        var username = $('#username').val().trim() ;
        var password = $('#password').val();
        var captcha = $('#captcha').val();

        if (CONFIG.portal.AccountFilter) {
            if (CONFIG.portal.AccountFilter === 'tolower') username = username.toLowerCase()
            if (CONFIG.portal.AccountFilter === 'toupper') username = username.toUpperCase()
        }

        // 对账号进行非空校验
        if (!portal.fieldCheck(username, 'blank')) return $('#username').focus();
        // 对密码进行非空校验
        if (!portal.fieldCheck(password, 'blank')) return $('#password').focus();

        // 写入用户信息
        portal.userInfo.username = username;
        portal.userPassword      = password;
        portal.userInfo.captchaVal  = captcha;
        portal.userInfo.domain   = mode || '';

        portal.checkCaptcha({
            // 认证方式为账号认证
            type: 'account',
            // 认证成功
            success: function () {
                // 若勾选记住密码
                if ($('#remember').prop('checked'))  portal.remember(true);
                // 若未勾选记住密码 或 不存在记住密码功能
                if (!$('#remember').prop('checked')) portal.remember(false);
                // 重定向至成功页
                portal.toSuccess();
            }
        });
    })

    // 点击登录按钮 - 账号认证
    $('#login-account').click(function () {
        // 如果开启双因素认证，则使用双因素认证方式
        if (portal.config.portal.MultiAuthSwitch) return MultiAuthLogin()

        normalLogin()
    });

    // 普通账号认证
    function normalLogin() {
        var username = $('#username').val().trim();
        var password = $('#password').val();
        var captcha = $('#captcha').val();

        if (CONFIG.portal.AccountFilter) {
            if (CONFIG.portal.AccountFilter === 'tolower') username = username.toLowerCase()
            if (CONFIG.portal.AccountFilter === 'toupper') username = username.toUpperCase()
        }

        // 若页面不存在 domain，则 domain 为空
        var domain   = $('#domain').val();
        // 若存在 domain 且 domain 存在排序情况，则对 domain 进行处理
        // 该处理方式是为了防止 app.conf 中 domain 排序不规范写成 1 - @domain 的情况
        if (domain && domain.substring(0, 1) !== '@') domain = '@' + domain.split('@')[1];
        // 兼容 domain value 为空进行排序
        if (domain === '@undefined') domain = '';

        // 对账号进行非空校验
        if (!portal.fieldCheck(username, 'blank')) return $('#username').focus();
        // 对密码进行非空校验
        if (!portal.fieldCheck(password, 'blank')) return $('#password').focus();

        // 写入用户信息
        portal.userInfo.username = username;
        portal.userPassword      = password;
        portal.userInfo.captchaVal  = captcha;
        portal.userInfo.domain   = domain || '';

        portal.checkCaptcha({
            // 认证方式为账号认证
            type: 'account',
            // 认证成功
            success: function () {
                // 若勾选记住密码
                if ($('#remember').prop('checked'))  portal.remember(true);
                // 若未勾选记住密码 或 不存在记住密码功能
                if (!$('#remember').prop('checked')) portal.remember(false);
                // 重定向至成功页
                portal.toSuccess();
            }
        });
    }

    // 双因素账号认证
    function MultiAuthLogin () {
        var username = $('#username').val().trim();
        var password = $('#password').val();
        var vcode = $('#vcode').val();
        var captcha = $('#captcha').val();

        if (CONFIG.portal.AccountFilter) {
            if (CONFIG.portal.AccountFilter === 'tolower') username = username.toLowerCase()
            if (CONFIG.portal.AccountFilter === 'toupper') username = username.toUpperCase()
        }

        // 若页面不存在 domain，则 domain 为空
        var domain   = $('#domain').val();
        // 若存在 domain 且 domain 存在排序情况，则对 domain 进行处理
        // 该处理方式是为了防止 app.conf 中 domain 排序不规范写成 1 - @domain 的情况
        if (domain && domain.substring(0, 1) !== '@') domain = '@' + domain.split('@')[1];
        // 兼容 domain value 为空进行排序
        if (domain === '@undefined') domain = '';

        // 对账号进行非空校验
        if (!portal.fieldCheck(username, 'blank')) return $('#username').focus();
        // 对密码进行非空校验
        if (!portal.fieldCheck(password, 'blank')) return $('#password').focus();

        // 写入用户信息
        portal.userInfo.username = username;
        portal.userPassword      = password;
        portal.userInfo.vcode    = vcode;
        portal.userInfo.captchaVal  = captcha;
        portal.userInfo.domain   = domain || '';

        portal.checkCaptcha({
            // 认证方式为账号认证
            type: 'multi',
            // 认证成功
            success: function () {
                // 若勾选记住密码
                if ($('#remember').prop('checked'))  portal.remember(true);
                // 若未勾选记住密码 或 不存在记住密码功能
                if (!$('#remember').prop('checked')) portal.remember(false);
                // 重定向至成功页
                portal.toSuccess();
            }
        });
    }

    // 点击登录按钮 - 邀请码认证
    $('#login-token').click(function () {
        var password = $('#password').val();
        // 对密码进行非空校验
        if (!portal.fieldCheck(password, 'blank')) return $('#password').focus();

        // 写入用户信息
        portal.userInfo.username = CREATER.tokenUser;
        portal.userPassword = password;
        portal.userInfo.domain   = '';
        // Portal 认证
        portal.login({
            // 认证方式为账号认证
            type: 'account'
        });
    });

    // 点击登录按钮 - 短信认证
    $('#login-sms').click(function () {
        var phone = $('#phone').val().replace(/ /g, '');
        var vcode = $('#vcode').val();
        // 对手机号进行非空校验 (存在给账号发送验证码情况，故不校验手机号格式)
        if (!portal.fieldCheck(phone, 'blank')) return $('#phone').focus();
        // 对验证码进行非空校验
        if (!portal.fieldCheck(vcode, 'blank')) return $('#vcode').focus();
        // 写入用户信息
        portal.userInfo.phone = phone;
        portal.userInfo.vcode = vcode;
        // Portal 认证
        portal.login({
            // 认证方式为短信认证
            type: 'sms'
        });
    });

    // 点击登录按钮 - OTP 认证
    $('#login-otp').click(function () {
        var username = $('#username').val().replace(/ /g, '');
        var password = $('#password').val();

        // 若页面不存在 domain，则 domain 为空
        var domain   = $('#domain').val();
        // 若存在 domain 且 domain 存在排序情况，则对 domain 进行处理
        // 该处理方式是为了防止 app.conf 中 domain 排序不规范写成 1 - @domain 的情况
        if (domain && domain.substring(0, 1) !== '@') domain = '@' + domain.split('@')[1];
        // 兼容 domain value 为空进行排序
        if (domain === '@undefined') domain = '';

        // 对账号进行非空校验
        if (!portal.fieldCheck(username, 'blank')) return $('#username').focus();
        // 对密码进行非空校验
        if (!portal.fieldCheck(password, 'blank')) return $('#password').focus();

        // 写入用户信息
        portal.userInfo.username = username;
        portal.userPassword = password;
        portal.userInfo.domain   = domain || '';

        // Portal 认证方法
        portal.login({
            // 认证方式为账号认证
            type: 'otp',
        });
    });

    // 点击登录按钮 - Cisco 认证
    $('#login-cisco').click(function () {
        var username = $('#username').val().replace(/ /g, '');
        var password = $('#password').val();
        // 对账号进行非空校验
        if (!portal.fieldCheck(username, 'blank')) return $('#username').focus();
        // 对密码进行非空校验
        if (!portal.fieldCheck(password, 'blank')) return $('#password').focus();
        // 写入用户信息
        portal.userInfo.username = username;
        portal.userPassword = password;
        // Portal 认证方法
        portal.login({
            // 认证方式为 Cisco 认证
            type: 'cisco',
        });
    })

    // 点击登录按钮 - Cisco SMS 认证
    $('#login-cisco-sms').click(function () {
        var phone = $('#phone').val().replace(/ /g, '');
        var vcode = $('#vcode').val();
        // 对手机号进行非空校验 (存在给账号发送验证码情况，故不校验手机号格式)
        if (!portal.fieldCheck(phone, 'blank')) return $('#phone').focus();
        // 对验证码进行非空校验
        if (!portal.fieldCheck(vcode, 'blank')) return $('#vcode').focus();
        // 写入用户信息
        portal.userInfo.phone = phone;
        portal.userInfo.vcode = vcode;
        // 写入隐藏 input
        $('input[name="username"]').val(phone);
        $('input[name="password"]').val(vcode);
        // Portal 认证方法
        portal.login({
            // 认证方式为 Cisco 认证
            type: 'cisco',
        });
    });

    // 点击登录按钮 - Huawei 认证
    $('#login-huawei').click(function () {
        var username = $('#username').val().replace(/ /g, '');
        var password = $('#password').val();
        // 若页面不存在 domain，则 domain 为空
        var domain   = $('#domain').val();
        // 若存在 domain 且 domain 存在排序情况，则对 domain 进行处理
        // 该处理方式是为了防止 app.conf 中 domain 排序不规范写成 1 - @domain 的情况
        if (domain && domain.substring(0, 1) !== '@') domain = '@' + domain.split('@')[1];
        // 兼容 domain value 为空进行排序
        if (domain === '@undefined') domain = '';
        // 对账号进行非空校验
        if (!portal.fieldCheck(username, 'blank')) return $('#username').focus();
        // 对密码进行非空校验
        if (!portal.fieldCheck(password, 'blank')) return $('#password').focus();

        // 写入用户信息
        portal.userInfo.username = username;
        portal.userPassword = password;
        portal.userInfo.domain   = domain || '';

        // Portal 认证方法
        portal.login({
            // 认证方式为账号认证
            type: 'huawei',
            // 认证成功
            success: function () {
                // 若勾选记住密码
                if ($('#remember').prop('checked'))  portal.remember(true);
                // 若未勾选记住密码 或 不存在记住密码功能
                if (!$('#remember').prop('checked')) portal.remember(false);
                // 重定向至成功页
                portal.toSuccess();
            }
        });
    });

    // 事件访客认证
    $('#login-event').click(function () {
        var phone = $('#phone').val().replace(/ /g, '');
        var vcode = $('#vcode').val();
        // 对手机号进行非空校验 (存在给账号发送验证码情况，故不校验手机号格式)
        if (!portal.fieldCheck(phone, 'blank')) return $('#phone').focus();
        // 对验证码进行非空校验
        if (!portal.fieldCheck(vcode, 'blank')) return $('#vcode').focus();
        // 写入用户信息
        portal.userInfo.phone = phone;
        portal.userInfo.vcode = vcode;
        // Portal 认证
        portal.login({
            // 认证方式为事件访客认证
            type: 'event'
        });
    })

    // 点击注销按钮
    $('#logout').click(function () {
        portal.confirm({
            message: portal.translate('LogoutConfirm'),
            confirm: function () {
                // Portal 注销
                portal.logout({
                    // 注销成功
                    success: function () {
                        // 若配置有 CAS 注销地址，则跳转至 CAS 注销地址
                        if (CREATER.casLogout && portal.getCookie('isCasLogin') === 'true') {
                            // 清除 isCasLogin Cookie
                            portal.setCookie('isCasLogin', '', -1);
                            location.href = CREATER.casLogout;
                        } else {
                            portal.toIndex();
                        }
                    }
                });
            },
            cancel: function () {}
        });
    });

    // 点击自助服务按钮
    $('#self-service').click(function () {
        // 若在登录页面点击，则读取账号及密码，进行自助服务单点登录
        if (!portal.online) {
            portal.userInfo.username = $('#username').val();
            portal.userPassword = $('#password').val();
        }
        // 开启自助服务
        portal.toSelfService();
    });

    // 回车触发认证
    $('input').keydown(function (e) {
        // 只有在输入框处于 focus 状态，且按下的按键是回车时才触发回车认证
        if (!$(this).is(':focus') || e.keyCode !== 13) return;
        $(this).blur();
        $('#login-account').click();
        $('#login-token').click();
        $('#login-sms').click();
    });

    // 点击 Logo
    $('.logo').click(function (e) {
        if (CREATER.logoLink) window.open(CREATER.logoLink);
    });

    // 点击忘记密码
    $('#forget').click(function (e) {
        // 修改密码模式为 portal 则开启修改密码对话框
        if (CREATER.changeMethod === 'portal') portal.dialog.open('changePassword');
        // 修改密码模式为自助服务则开启自助服务修改密码页面
        if (CREATER.changeMethod === 'selfService') portal.toSelfService('/forget');
        // 修改密码模式为外部链接，但未配置链接地址，则开启自助服务修改密码页面
        if (CREATER.changeMethod === 'link' && !CREATER.forgetUrl) portal.toSelfService('/forget');
        // 修改密码模式为外部链接，配置有链接地址，则开启链接地址
        if (CREATER.changeMethod === 'link' && CREATER.forgetUrl)  window.open(CREATER.forgetUrl);
    });

    // 获取验证码
    $('#btn-get-vcode').click(function () {
        if ($(this).attr('data-status') === 'disable') return;
        // 去除手机号中空格
        var phone = $('#phone').val().replace(/ /g, '');
        // 存在给账号发送验证码情况，故不校验手机号格式
        if (!portal.fieldCheck(phone, 'blank')) return $('#phone').focus();
        // 发送验证码
        portal.sendVCode({
            phone: phone,
            success: function () {
                portal.confirm(portal.translate('SendVerifyCodeOK'));
                portal.vcodeCountdown($('#btn-get-vcode'));
            }
        });
    });

    // 双因素认证获取验证码
    $('#btn-get-vcode-multi').click(function () {
        var username = $('#username').val().replace(/ /g, '')
        var password = $('#password').val()
        // 对账号进行非空校验
        if (!portal.fieldCheck(username, 'blank')) return $('#username').focus()
        // 对密码进行非空校验
        if (!portal.fieldCheck(password, 'blank')) return $('#password').focus()

        if ($(this).attr('data-status') === 'disable') return

        // 写入用户信息
        portal.userInfo.username = username
        portal.userInfo.phone = username
        portal.userPassword = password

        // 账号密码校验
        portal.login({
            type    : 'cisco',
            success : function () {
                // 发送验证码
                portal.sendVCode({
                    type   : 'multi',
                    phone: username,
                    success: function (res) {
                        portal.confirm(portal.translate(res))
                        portal.vcodeCountdown($('#btn-get-vcode-multi'))
                    },
                })
            },
        })
    })

    // 切换认证方式
    $('.panel-row-item.login-mode').click(function () {
        var mode = $(this).attr('data-mode');
        if (mode === 'wechat')                    return portal.login({ type: 'wechat' });
        if (mode === 'account' && !Portal.mobile) return Portal.redirect('/srun_portal_pc');
        if (mode === 'sms'     && !Portal.mobile) return Portal.redirect('/srun_portal_sms');
        if (mode === 'otp'     && !Portal.mobile) return Portal.redirect('/srun_portal_otp');
        if (mode === 'sso')                       return Portal.redirect('/srun_portal_sso');
        if (mode === 'qrcode')                    return Portal.redirect('/srun_portal_scan_qrcode');
        if (mode === 'wework')                    return Portal.redirect('/srun_portal_wework');
        if (mode === 'token')                     return Portal.redirect('/srun_portal_token');
        if (mode === 'huawei')                    return Portal.redirect('/srun_portal_huawei');
        // Mobile
        if (mode === 'account' && Portal.mobile)  return Portal.redirect('/srun_portal_phone');
        if (mode === 'sms'     && Portal.mobile)  return Portal.redirect('/srun_portal_sms_mobile');
        if (mode === 'otp'     && Portal.mobile)  return Portal.redirect('/srun_portal_otp_mobile');
        if (mode === 'huawei'  && Portal.mobile)  return Portal.redirect('/srun_portal_huawei_mobile');

        if (mode === 'cisco')                     return Portal.redirect('/srun_portal_cisco');
        if (mode === 'cisco-sms')                 return Portal.redirect('/srun_portal_cisco_sms');
    })

    // 切换语言
    $('#change-lang').change(function () {
        portal.changeLang($(this).val());
    });

    // 点击使用协议
    $("#protocol-content").click(function () {
        // 弹框显示协议内容
        if (Portal.mobile) {
            $('#app').css('overflow-y', 'hidden');
            portal.detail({
                title   : portal.portalInfo.protocol.title,
                message : portal.portalInfo.protocol.content,
                confirm : function () {
                    $('#app').css('overflow-y', 'auto');
                    if (!$('#protocol').prop('checked')) $('#protocol').prop('checked', true);
                }
            });
        }
        if (!Portal.mobile) {
            portal.confirm({
                title  : portal.portalInfo.protocol.title,
                message: portal.portalInfo.protocol.content,
                confirm: function () {
                    if (!$('#protocol').prop('checked')) $('#protocol').prop('checked', true);
                }
            });
        }
    });

    // 下载客户端
    $(".download-container .panel-row-item").click(function () {
        var action = $(this).attr('data-action')
        var target = '';
        if (action === 'win')     target = '/download/clients/PortalApp.install.exe';
        if (action === 'macApple')target = '/download/clients/PortalApp-arm64.dmg';
        if (action === 'macIntel')target = '/download/clients/PortalApp-x64.dmg';
        if (action === 'linux')   target = '/download/clients/PortalApp.AppImage';
        if (action === 'android') target = '/download/clients/PortalApp.apk';
        if (action === 'ios')     target = 'https://itunes.apple.com/cn/app/shen-lan/id849464884?mt=8';
        window.open(target);
    });

    if (navigator.userAgent.includes('MSIE 9.0')) {
        $('.iconfont, .material-icons, .icon').hide();
        $("#app .section .panel-login .input-box").css("padding-left","20px");
    }

    $('#dial-result').click(function () {
        portal.ajax.get({
            url    : '/v1/srun_portal_diallog',
            params : {
                username: portal.userInfo.username,
            },
            success: function (res) {
                portal.confirm(portal.translate(res))
            },
            error  : function (res) {
                portal.confirm(portal.translate(res))
            },
        })
    })
});
