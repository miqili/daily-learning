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

/** katex/contrib/auto-render：只改文本节点、不动 HTML 结构，用于「HTML 正文 + $公式$」混排 */
declare module 'katex/contrib/auto-render' {
  export interface AutoRenderDelimiter {
    left: string;
    right: string;
    display: boolean;
  }
  export interface AutoRenderOptions {
    delimiters?: AutoRenderDelimiter[];
    ignoredTags?: string[];
    ignoredClasses?: string[];
    throwOnError?: boolean;
    errorCallback?: (message: string, error: Error) => void;
    strict?: boolean | string | ((errorCode: string) => boolean | string);
  }
  export default function renderMathInElement(element: HTMLElement, options?: AutoRenderOptions): void;
}
