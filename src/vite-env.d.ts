/// <reference types="vite/client" />

declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";

  export interface LessonMeta {
    title: string;
    module: number;
    commands: string[];
  }

  export const meta: LessonMeta;

  export default function MDXContent(props: MDXProps): JSX.Element;
}
