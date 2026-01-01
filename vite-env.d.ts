declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    YOUTUBE_API_KEY: string;
    [key: string]: string | undefined;
  }
}