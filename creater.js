var CREATER = {
    // 是否启用通知
    notice            : true,
    // 是否启用视频
    video             : false,
    // 是否使用页面内部通知 (关闭则跳转到自服务查看通知内容)
    noticeAlert       : true,
    // 在列表通知模式下是否显示通知索引
    noticeIndex       : false,
    // 通知时间类型 (update || create)
    noticeTime        : 'update',
    // 成功页是否显示查询代拨按钮
    showDialLog       : false,
    // 是否开启记住密码 (需要配合 custom.css 进行配置，后续版本进行优化)
    remember          : true,
    //  是否开启修改密码 (需要配合 custom.css 进行配置，后续版本进行优化)
    forget            : false,
    //  修改密码方式 (portal || selfService || link)
    changeMethod      : 'portal',
    // portal 修改密码方式
    portalChange      : ['pass', 'sms', 'mail'],
    // portal 默认找回密码方式(从上方数组中选取
    defaultMethod     : 'sms',
    // 修改密码地址 (当 changeMethod 为 link 时，点击修改密码将开启此页面)
    forgetUrl         : 'https://www.baidu.com',
    // Logo 链接地址 (不填写则点击 Logo 无链接)
    logoLink          : 'https://www.uestrc.edu.cn',
    // 高并发预案地址 (实验功能，若遇到此需求联系研发解决)
    highBurst         : 'https://www.baidu.com',
    // 邀请码认证的账号
    tokenUser         : 'srun_token',
    // 短信认证是否为访客使用
    SMSVisitor        : true,
    // 二维码背景色
    background        : '#FFFFFF',
    // 二维码前景色
    foreground        : '#008AC9',
    // 企业微信二维码背景色
    weworkBackground  : '#FFFFFF',
    // 企业微信二维码前景色
    weworkForeground  : '#008AC9',
    // 二维码尺寸 (单位 px)
    size              : 180,
    // 是否启用支付缴费功能
    usePay            : false,
    // 是否启用在线设备管理（当超出在线数后，对已在线设备进行管理）
    useOnlineDeviceMgr: false,
    // 新增链接
    authentication    : [],
    // 在线时展示的信息
    onlineInfo        : [
        'username',
        'usedFlow',
        'usedTime',
       // 'balance',
        'ipv4',
        'productName'
    ],
    // 对密码进行编码
    cryptography: false,
    // cas 注销重定向链接，不填则默认跳转认证页
    casLogout: '',
    // 域名认证按钮
    // 按钮名如需翻译，请在 lang.js 添加，这里的 btnName 写成添加翻译的 key 即可
    // 最多配置两个按钮，否则样式会变形
    domainLoginBtn: [
        { btnName: '校园网登录', domain: '@dx-uestc', color: '#64BD6D'},
        { btnName: '电信登录', domain: '@dx', color: '#57B2CD'},
    ],
}
