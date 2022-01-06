<h1 align="center">angular-miniprogram - 使用 Angular 开发小程序 </h1>

<p align="center">尽可能使用 Angular 已有生态,降低跨平台时所需成本</p>

<p align="center">
  <a href="https://gitter.im/angular-miniprogram/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge">
    <img src="https://badges.gitter.im/angular-miniprogram/community.svg" alt="gitter" />
  </a>&nbsp;
    <a href="https://www.npmjs.com/package/angular-miniprogram">
    <img src="https://img.shields.io/npm/v/angular-miniprogram.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen" alt="angular-miniprogram on npm" />
  </a>&nbsp;
    <a href="https://wszgrcy.github.io/angular-miniprogram/coverage/index.html">
    <img src="https://wszgrcy.github.io/angular-miniprogram/badge.svg" alt="coverage" />
  </a>

</p>

[English](readme-en.md) | 简体中文

<hr>

## 文档

- [快速启动](https://github.com/wszgrcy/angular-miniprogram/blob/master/quick-start.md)
- [注意事项](https://github.com/wszgrcy/angular-miniprogram/blob/master/attention.md)
- [小程序特性](https://github.com/wszgrcy/angular-miniprogram/blob/master/miniprogram-feature.md)
- [API](https://wszgrcy.github.io/angular-miniprogram)

## 开发环境

### 前提条件

- `Node.js` 版本大于 14
- `@angular/cli` 版本为 13
- `yarn`

### hello-world

- 使用[https://github.com/wszgrcy/angular-miniprogram-template](https://github.com/wszgrcy/angular-miniprogram-template)模板或将此项目下载
- 使用 yarn 安装依赖

### 快速启动

- [快速启动](https://github.com/wszgrcy/angular-miniprogram/blob/master/quick-start.md)

## 生态

- 支持`Angualr`的全部服务及管道
- 兼容性支持指令(与 Angular 不同)
- 组件目前在一个文件中只能存在一个

## 支持平台

| 平台名    | 是否实现 | 关联               | 注释                                                                                                              |
| --------- | -------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 微信      | ✅       | 企业微信           |                                                                                                                   |
| 字节跳动  | ✅       |                    |                                                                                                                   |
| 京东      | ❌       |                    | 没有账号                                                                                                          |
| 百度智能  | ✅       |                    |                                                                                                                   |
| 支付宝    | ✅       | 钉钉,支付宝 IoT 等 | 不能使用 Prod,问题[参见](https://forum.alipay.com/mini-app/post/65101060);不能使用基础库 2.0 编译,slot 有部分问题 |
| qq 小程序 | ✅       |                    | (非微信变种),但是事件有未知报错?但是好像也不影响                                                                  |
| 飞书      | ❌       |                    | 与字节跳动类似,但是编译有点问题                                                                                   |
