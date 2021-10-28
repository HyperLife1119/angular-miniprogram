import { Injectable } from 'static-injector';
import { WxTransformLike } from '../template-transform-strategy/wx-like/wx-transform.base';

export enum PlatformType {
  wx = 'wx',
}
@Injectable()
export class BuildPlatform {
  globalObject!: string;
  globalVariablePrefix!: string;
  constructor(public templateTransform: WxTransformLike) {}
}
