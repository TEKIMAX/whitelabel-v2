import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export interface PageConfig {
  _id: string;
  orgId: string;
  pageKey: string;
  category: string;
  label: string;
  icon?: string;
  sortOrder: number;
  visible: boolean;
  customLabel?: string;
  customIcon?: string;
  updatedAt: number;
}

export interface PageCategory {
  key: string;
  label: string;
  sortOrder: number;
}

export function usePageConfigs(orgId: string | undefined) {
  const configs = useQuery(
    api.pageConfigs.getByOrg,
    orgId ? { orgId } : "skip"
  );
  
  return configs as PageConfig[] | undefined;
}

export function useVisiblePages(orgId: string | undefined) {
  const pages = useQuery(
    api.pageConfigs.getVisiblePages,
    orgId ? { orgId } : "skip"
  );
  
  const categories = useQuery(
    api.pageConfigs.getCategories,
    orgId ? { orgId } : "skip"
  );
  
  return {
    pages: pages as PageConfig[] | undefined,
    categories: categories as PageCategory[] | undefined,
  };
}

export function useUpdatePageConfig() {
  return useMutation(api.pageConfigs.upsert);
}

export function useBatchUpdatePageConfigs() {
  return useMutation(api.pageConfigs.batchUpdate);
}

export function useHidePage() {
  return useMutation(api.pageConfigs.hidePage);
}

export function useShowPage() {
  return useMutation(api.pageConfigs.showPage);
}

export function useResetPageConfigs() {
  return useMutation(api.pageConfigs.resetToDefaults);
}