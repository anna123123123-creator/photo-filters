# 照片滤镜工坊 · Photo Filters

**[在线体验 →](https://anna123123123-creator.github.io/photo-filters/)**

免费开源、纯浏览器运行的照片滤镜小工具：上传一张照片，一键应用灰度、复古、反色、色调分离、马赛克、赛博朋克等滤镜效果，处理完直接下载。全部在你的浏览器本地用 Canvas 处理，不上传服务器、不追踪。

![screenshot](screenshot.png)

## 试用方法

直接用浏览器打开 `index.html`，或者用静态文件服务器跑起来：

```bash
python3 -m http.server 8000
```

## 实现原理

所有滤镜都是对 Canvas `ImageData` 做逐像素运算：
- **灰度**：亮度加权平均
- **复古**：经典 sepia 矩阵变换
- **反色**：`255 - value`
- **色调分离**：把每个通道量化到固定档位
- **马赛克**：分块取平均色
- **赛博朋克**：按亮度做双色调映射 + 扫描线

`script.js` 里大概 150 行原生 JavaScript，没有用任何图像处理库。

## 协议

MIT。

## 相关项目

这个是做 **AI 头像生成**产品时顺手做的免费小工具——固定几个滤镜风格。完整版是 AI 智能生成卡通、像素、油画、赛博朋克等多种风格，还有完整的多租户管理后台，源码在这：[全能源码 · AI 头像生成网站源码](https://inzyxuashop.com/aitouxiang-yuanma.html)。
