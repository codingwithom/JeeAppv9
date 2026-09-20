import React, { useState, useEffect } from "react";

export type PreloadableComponent<P = any> = React.ComponentType<P> & {
  preload: () => Promise<any>;
};

export function eagerLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>
): PreloadableComponent<React.ComponentProps<T>> {
  let LoadedComponent: T | null = null;
  let loadPromise: Promise<T> | null = null;

  const preload = (): Promise<T> => {
    if (!loadPromise) {
      loadPromise = importFn().then(mod => {
        LoadedComponent = ((mod as any).default || mod) as T;
        return LoadedComponent;
      });
    }
    return loadPromise;
  };

  const LazyWrapper: React.FC<any> = (props: any) => {
    const [, setRenderTick] = useState(0);

    useEffect(() => {
      if (!LoadedComponent) {
        preload().then(() => {
          setRenderTick(t => t + 1);
        });
      }
    }, []);

    if (LoadedComponent) {
      const Comp = LoadedComponent as React.ComponentType<any>;
      return <Comp {...props} />;
    }

    // Instant graceful placeholder for the rare case where user clicks before background preloading completes
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] p-8 animate-in fade-in duration-100">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  };

  (LazyWrapper as any).preload = preload;
  return LazyWrapper as PreloadableComponent<React.ComponentProps<T>>;
}
