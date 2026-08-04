declare module 'katex' {
  export interface KatexOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    output?: 'html' | 'mathml' | 'htmlAndMathml';
    strict?: boolean | string | ((errorCode: string) => boolean | string);
    trust?: boolean | ((context: Record<string, unknown>) => boolean);
  }
  export function renderToString(tex: string, options?: KatexOptions): string;
}
