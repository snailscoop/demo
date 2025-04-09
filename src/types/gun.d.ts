declare module 'gun' {
  interface GunOptions {
    peers?: string[];
    localStorage?: boolean;
    panic?: {
      wait: number;
      max: number;
      check: {
        'network down'?: boolean;
        'connection loss'?: boolean;
        'disconnection'?: boolean;
        'timeout'?: boolean;
      };
      code: number;
    };
    axe?: boolean;
    multicast?: boolean;
  }

  interface GunChain<T = any> {
    put(data: T, cb?: (ack: { err?: string; ok?: number }) => void): GunChain<T>;
    get(key: string): GunChain<T>;
    once(cb: (data: T) => void): void;
    on(cb: (data: T) => void): { off: () => void };
  }

  class Gun {
    constructor(options?: GunOptions);
    get(key: string): GunChain;
    on(event: string, callback: (msg: any) => void): void;
    opt(options: Partial<GunOptions>): void;
  }

  export default Gun;
}

declare module 'gun/sea' {}
declare module 'gun/lib/panic.js' {} 