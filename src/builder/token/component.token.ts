import { InjectionToken } from 'static-injector';

export const COMPONENT_FILE_NAME_TOKEN = new InjectionToken<string>(
  'COMPONENT_FILE_NAME_TOKEN'
);
export const COMPONENT_TEMPLATE_CONTENT_TOKEN = new InjectionToken<string>(
  'COMPONENT_TEMPLATE_CONTENT_TOKEN'
);
export const TEMPLATE_COMPILER_OPTIONS_TOKEN = new InjectionToken(
  'TEMPLATE_COMPILER_TOKEN'
);