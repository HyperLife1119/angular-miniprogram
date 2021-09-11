import * as webpack from 'webpack';
import { BuilderContext } from '@angular-devkit/architect';
import {
  AssetPattern,
  BrowserBuilderOptions,
} from '@angular-devkit/build-angular';
import { normalizeAssetPatterns } from '@angular-devkit/build-angular/src/utils/normalize-asset-patterns';
import { getSystemPath, normalize, Path, resolve } from '@angular-devkit/core';
import * as path from 'path';
import * as glob from 'glob';
import { BootstrapAssetsPlugin } from 'webpack-bootstrap-assets-plugin';
import { ExportWeiXinAssetsPlugin } from './plugin/export-weixin-assets.plugin';
import { PagePattern } from './type';
import * as fs from 'fs';
import { getPlatformInfo, PlatformInfo } from './platform/platform-info';
import { PlatformType } from './platform/platform';
import { DefinePlugin } from 'webpack';
type OptimizationOptions = NonNullable<webpack.Configuration['optimization']>;
type OptimizationSplitChunksOptions = Exclude<
  OptimizationOptions['splitChunks'],
  false | undefined
>;
type OptimizationSplitChunksCacheGroup = Exclude<
  NonNullable<OptimizationSplitChunksOptions['cacheGroups']>[''],
  false | string | Function | RegExp
>;
function globAsync(pattern: string, options: glob.IOptions) {
  return new Promise<string[]>((resolve, reject) =>
    glob.default(pattern, options, (e, m) => (e ? reject(e) : resolve(m)))
  );
}
export class WebpackConfigurationChange {
  pageList: PagePattern[] = [];
  componentList: PagePattern[] = [];
  workspaceRoot!: Path;
  absoluteProjectRoot!: Path;
  absoluteProjectSourceRoot!: Path;
  private platformInfo: PlatformInfo;

  constructor(
    private options: BrowserBuilderOptions & {
      pages: AssetPattern[];
      components: AssetPattern[];
      platform: PlatformType;
    },
    private context: BuilderContext,
    private config: webpack.Configuration
  ) {
    this.platformInfo = getPlatformInfo(options.platform);
    config.output!.globalObject = this.platformInfo.globalObject;
  }

  async change() {
    await this.pageHandle();
    this.exportWeiXinAssetsPlugin();
    this.componentTemplateLoader();
    this.definePlugin();
    this.changeStylesExportSuffix();
  }
  private async pageHandle() {
    this.workspaceRoot = normalize(this.context.workspaceRoot);
    const projectName = this.context.target && this.context.target.project;
    if (!projectName) {
      throw new Error('The builder requires a target.');
    }
    let projectMetadata = await this.context.getProjectMetadata(projectName);
    this.absoluteProjectRoot = normalize(
      getSystemPath(
        resolve(
          this.workspaceRoot,
          normalize((projectMetadata.root as string) || '')
        )
      )
    );
    let relativeSourceRoot = projectMetadata.sourceRoot as string | undefined;
    let absoluteSourceRootPath =
      typeof relativeSourceRoot === 'string'
        ? resolve(this.workspaceRoot, normalize(relativeSourceRoot))
        : undefined;
    this.absoluteProjectSourceRoot =
      relativeSourceRoot &&
      (normalize(getSystemPath(absoluteSourceRootPath!)) as any);

    this.pageList = await this.generateModuleInfo(this.options.pages);
    this.componentList = await this.generateModuleInfo(this.options.components);
    let list = [...this.pageList, ...this.componentList];
    // 入口
    for (let i = 0; i < list.length; i++) {
      const item = list[i];

      (this.config.entry as Record<string, any>)[item.entryName] = [item.src];
    }
    // 出口
    let oldFileName = this.config.output!.filename as Function;
    this.config.output!.filename = (chunkData) => {
      let page = list.find((item) => item.entryName === chunkData.chunk!.name);
      if (page) {
        return page.outputWXS;
      }
      return oldFileName(chunkData);
    };
    // 共享依赖
    let oldChunks = (this.config.optimization!.splitChunks as any).cacheGroups
      .defaultVendors.chunks;
    (
      (
        this.config.optimization!
          .splitChunks! as any as OptimizationSplitChunksOptions
      ).cacheGroups!.defaultVendors as OptimizationSplitChunksCacheGroup
    ).chunks = (chunk) => {
      if (list.find((item) => item.entryName === chunk.name)) {
        return true;
      }
      return oldChunks(chunk);
    };
    ((this.config.optimization!.splitChunks as OptimizationSplitChunksOptions)
      .cacheGroups!['moduleChunks'] as OptimizationSplitChunksCacheGroup) = {
      test: (module: webpack.NormalModule) => {
        let name = module.nameForCondition();
        return (
          name && name.endsWith('.ts') && !/[\\/]node_modules[\\/]/.test(name)
        );
      },
      minChunks: 2,
      minSize: 0,
      name: 'module-chunk',
      chunks: 'all',
    };
    // 出口保留必要加载
    let assetsPlugin = new BootstrapAssetsPlugin();
    assetsPlugin.hooks.removeChunk.tap('pageHandle', (chunk) => {
      if (
        list.some((page) => page.entryName === chunk.name) ||
        chunk.name === 'styles'
      ) {
        return true;
      }
      return false;
    });
    assetsPlugin.hooks.emitAssets.tap('pageHandle', (object, json) => {
      return {
        'app.js':
          fs
            .readFileSync(path.resolve(__dirname, './template/app-template.js'))
            .toString() +
          json.scripts.map((item) => `require('./${item.src}')`).join(';'),
      };
    });
    this.config.plugins!.push(assetsPlugin);
  }
  exportWeiXinAssetsPlugin() {
    this.config.plugins!.unshift(
      new ExportWeiXinAssetsPlugin({
        tsConfig: path.resolve(
          this.context.workspaceRoot,
          this.options.tsConfig
        ),
        pageList: this.pageList,
        componentList: this.componentList,
        platformInfo: this.platformInfo,
      })
    );
  }
  async generateModuleInfo(list: AssetPattern[]) {
    let patternList = normalizeAssetPatterns(
      list,
      this.workspaceRoot,
      this.absoluteProjectRoot,
      this.absoluteProjectSourceRoot
    );
    let moduleList: PagePattern[] = [];
    for (const pattern of patternList) {
      const cwd = path.resolve(this.context.workspaceRoot, pattern.input);
      /** 当前匹配匹配到的文件 */
      const files = await globAsync(pattern.glob, {
        cwd,
        dot: true,
        nodir: true,
        ignore: pattern.ignore || [],
        follow: pattern.followSymlinks,
      });

      moduleList.push(
        ...files.map((file) => {
          let object: Partial<PagePattern> = {
            entryName: path.basename(file, '.ts').replace(/\./g, '-'),
            fileName: file,
            src: path.join(cwd, file),
            ...pattern,
          };
          object.outputWXS = path
            .join(pattern.output, object.fileName!)
            .replace(/\.ts$/g, '.js');
          object.outputWXSS = object.outputWXS.replace(/\.js$/g, '.wxss');
          object.outputWXML = object.outputWXS.replace(/\.js$/g, '.wxml');
          return object as PagePattern;
        })
      );
    }
    return moduleList;
  }
  private componentTemplateLoader() {
    this.config.module!.rules!.unshift({
      test: /\.ts$/,
      loader: (require as any).resolve(
        path.join(__dirname, './loader/component-template.loader')
      ),
    });
  }
  private definePlugin() {
    const defineObject: Record<string, string> = {
      global: `${this.platformInfo.globalObject}.__global`,
      window: `${this.platformInfo.globalObject}.__window`,
      Zone: `${this.platformInfo.globalObject}.__window.Zone`,
      setTimeout: `${this.platformInfo.globalObject}.__window.setTimeout`,
      clearTimeout: `${this.platformInfo.globalObject}.__window.clearTimeout`,
      setInterval: `${this.platformInfo.globalObject}.__window.setInterval`,
      clearInterval: `${this.platformInfo.globalObject}.__window.clearInterval`,
      setImmediate: `${this.platformInfo.globalObject}.__window.setImmediate`,
      clearImmediate: `${this.platformInfo.globalObject}.__window.clearImmediate`,
      Promise: `${this.platformInfo.globalObject}.__window.Promise`,
      Reflect: `${this.platformInfo.globalObject}.__window.Reflect`,
      requestAnimationFrame: `${this.platformInfo.globalObject}.__window.requestAnimationFrame`,
      cancelAnimationFrame: `${this.platformInfo.globalObject}.__window.cancelAnimationFrame`,
      performance: `${this.platformInfo.globalObject}.__window.performance`,
      navigator: `${this.platformInfo.globalObject}.__window.navigator`,
    };
    if (this.config.mode === 'development') {
      defineObject['ngDevMode'] = `${this.platformInfo.globalObject}.ngDevMode`;
    }
    this.config.plugins!.push(new DefinePlugin(defineObject));
  }
  private changeStylesExportSuffix() {
    let index = this.config.plugins?.findIndex(
      (plugin) =>
        Object.getPrototypeOf(plugin).constructor.name ===
        'MiniCssExtractPlugin'
    );
    if (typeof index === 'number') {
      let pluginInstance = this.config.plugins![index] as any;
      let pluginPrototype = Object.getPrototypeOf(pluginInstance);
      this.config.plugins?.splice(
        index,
        1,
        new pluginPrototype.constructor({
          filename: (pluginInstance.options.filename as string).replace(
            /\.css$/,
            '.wxss'
          ),
        })
      );
    }
  }
}
