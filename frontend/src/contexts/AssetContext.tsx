import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Asset, AssetState, AssetStatus, AssetType, AudioTiming } from '../types';

const defaultAssetState: AssetState = {
  assets: new Map(),
  timings: new Map(),
  generationQueue: [],
};

interface AssetContextType {
  assets: Map<string, Asset>;
  timings: Map<string, AudioTiming>;
  generationQueue: string[];
  createAsset: (sceneId: string, type: AssetType) => string;
  updateAssetStatus: (assetId: string, status: AssetStatus, error?: string) => void;
  setAssetData: (assetId: string, data: Blob, dataUrl?: string, duration?: number) => void;
  setTiming: (assetId: string, timing: AudioTiming) => void;
  addToQueue: (assetIds: string[]) => void;
  removeFromQueue: (assetId: string) => void;
  incrementRetryCount: (assetId: string) => void;
  getAssetsByScene: (sceneId: string) => { image?: Asset; audio?: Asset };
  clearAssets: () => void;
}

const AssetContext = createContext<AssetContextType | null>(null);

interface AssetProviderProps {
  children: ReactNode;
}

export function AssetProvider({ children }: AssetProviderProps) {
  const [state, setState] = useState<AssetState>(defaultAssetState);

  const createAsset = (sceneId: string, type: AssetType): string => {
    const id = crypto.randomUUID();
    const newAsset: Asset = {
      id,
      sceneId,
      type,
      status: 'pending',
      data: null,
      dataUrl: null,
      duration: null,
      error: null,
      retryCount: 0,
    };

    setState((prev) => {
      const newAssets = new Map(prev.assets);
      newAssets.set(id, newAsset);
      return {
        ...prev,
        assets: newAssets,
      };
    });

    return id;
  };

  const updateAssetStatus = (assetId: string, status: AssetStatus, error?: string) => {
    setState((prev) => {
      const newAssets = new Map(prev.assets);
      const asset = newAssets.get(assetId);
      if (asset) {
        newAssets.set(assetId, {
          ...asset,
          status,
          error: error ?? null,
        });
      }
      return {
        ...prev,
        assets: newAssets,
      };
    });
  };

  const setAssetData = (assetId: string, data: Blob, dataUrl?: string, duration?: number) => {
    setState((prev) => {
      const newAssets = new Map(prev.assets);
      const asset = newAssets.get(assetId);
      if (asset) {
        newAssets.set(assetId, {
          ...asset,
          data,
          dataUrl: dataUrl ?? null,
          duration: duration ?? null,
          status: 'complete',
        });
      }
      return {
        ...prev,
        assets: newAssets,
      };
    });
  };

  const setTiming = (assetId: string, timing: AudioTiming) => {
    setState((prev) => {
      const newTimings = new Map(prev.timings);
      newTimings.set(assetId, timing);
      return {
        ...prev,
        timings: newTimings,
      };
    });
  };

  const addToQueue = (assetIds: string[]) => {
    setState((prev) => ({
      ...prev,
      generationQueue: [...prev.generationQueue, ...assetIds],
    }));
  };

  const removeFromQueue = (assetId: string) => {
    setState((prev) => ({
      ...prev,
      generationQueue: prev.generationQueue.filter((id) => id !== assetId),
    }));
  };

  const incrementRetryCount = (assetId: string) => {
    setState((prev) => {
      const newAssets = new Map(prev.assets);
      const asset = newAssets.get(assetId);
      if (asset) {
        newAssets.set(assetId, {
          ...asset,
          retryCount: asset.retryCount + 1,
        });
      }
      return {
        ...prev,
        assets: newAssets,
      };
    });
  };

  const getAssetsByScene = useCallback((sceneId: string): { image?: Asset; audio?: Asset } => {
    const result: { image?: Asset; audio?: Asset } = {};
    for (const asset of state.assets.values()) {
      if (asset.sceneId === sceneId) {
        if (asset.type === 'image') {
          result.image = asset;
        } else if (asset.type === 'audio') {
          result.audio = asset;
        }
      }
    }
    return result;
  }, [state.assets]);

  const clearAssets = () => {
    setState(defaultAssetState);
  };

  const value = useMemo(
    () => ({
      assets: state.assets,
      timings: state.timings,
      generationQueue: state.generationQueue,
      createAsset,
      updateAssetStatus,
      setAssetData,
      setTiming,
      addToQueue,
      removeFromQueue,
      incrementRetryCount,
      getAssetsByScene,
      clearAssets,
    }),
    [state, getAssetsByScene]
  );

  return (
    <AssetContext.Provider value={value}>{children}</AssetContext.Provider>
  );
}

export function useAssets(): AssetContextType {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
}
