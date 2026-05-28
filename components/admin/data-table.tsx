'use client';

import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  emptyMessage?: string;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.sortable ? 'cursor-pointer select-none hover:text-gray-900' : ''}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12">
                  <p className="text-gray-400 text-sm">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id as string ?? index}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(item, index)
                        : (item[col.key] as ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
