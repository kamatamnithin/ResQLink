import React from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Search, Filter, Download, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface EmergencyFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  distanceFilter: string;
  onDistanceFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onExport?: () => void;
  showExport?: boolean;
}

export const EmergencyFilters: React.FC<EmergencyFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  distanceFilter,
  onDistanceFilterChange,
  onClearFilters,
  onExport,
  showExport = true,
}) => {
  const hasActiveFilters =
    searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || distanceFilter !== 'all';

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by patient name, ID, or phone..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="enroute">En Route</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Priority</label>
              <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Distance Filter */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Distance</label>
              <Select value={distanceFilter} onValueChange={onDistanceFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Distances" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Distances</SelectItem>
                  <SelectItem value="5">Within 5 km</SelectItem>
                  <SelectItem value="10">Within 10 km</SelectItem>
                  <SelectItem value="20">Within 20 km</SelectItem>
                  <SelectItem value="50">Within 50 km</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 items-end">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={onClearFilters}
                  className="flex-1"
                  size="default"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
              {showExport && onExport && (
                <Button
                  variant="outline"
                  onClick={onExport}
                  className="flex-1"
                  size="default"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
              {searchTerm && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                  Search: "{searchTerm}"
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                  Status: {statusFilter}
                </span>
              )}
              {priorityFilter !== 'all' && (
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                  Priority: {priorityFilter}
                </span>
              )}
              {distanceFilter !== 'all' && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                  Distance: ≤ {distanceFilter} km
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
