import React, { useState, useEffect, useRef } from 'react';
import {
  Provider,
  defaultTheme,
  View,
  Heading,
  Text,
  Flex,
  ProgressBar,
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  Divider,
  Picker,
  Item,
  Dialog,
  DialogTrigger,
  Content,
  Button,
  StatusLight,
  NumberField
} from '@adobe/react-spectrum';
import { useAsyncList } from '@react-stately/data';
import type { Key } from '@adobe/react-spectrum';
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'https://wf-api-explorer.vercel.app/api'
});

interface BaseObject {
  ID: string;
  name: string;
  status?: string;
}

interface Project extends BaseObject {
  percentComplete?: number;
  plannedCompletionDate?: string;
}

interface Task extends BaseObject {
  assignedToID?: string;
  duration?: number;
  percentComplete?: number;
}

interface Issue extends BaseObject {
  priority?: string;
  severity?: string;
}

type ApiObject = Project | Task | Issue;

interface SortDescriptor {
  column: Key;
  direction: 'ascending' | 'descending';
}

interface PaginationData {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ApiResponse {
  data: ApiObject[];
  pagination: PaginationData;
}

interface AsyncListState {
  items: ApiObject[];
  cursor?: string;
  hasMore?: boolean;
}

function App() {
  const [objectType, setObjectType] = useState<Key>('Projects');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'name',
    direction: 'ascending'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<ApiObject[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const loadData = async (pageNum: number, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = String(objectType).toLowerCase();
      const pageSize = 200; // Increased page size to handle more records
      const response = await api.get<ApiResponse>(`/${endpoint}/search`, {
        params: { 
          page: pageNum, 
          pageSize,
          fields: 'name,status,percentComplete,plannedCompletionDate,assignedToID,duration,priority,severity'
        }
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      const newItems = Array.isArray(response.data.data) ? response.data.data : [];
      const pagination = response.data.pagination;
      
      console.log(`Loaded ${newItems.length} items, total count: ${pagination?.totalCount}`);
      
      setItems(prev => append ? [...prev, ...newItems] : newItems);
      
      if (pagination) {
        setTotalCount(pagination.totalCount);
        setHasMore(pageNum * pageSize < pagination.totalCount);
      } else {
        setTotalCount(newItems.length);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error : new Error('Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    setPage(1);
    loadData(1, false);
  }, [objectType]);

  // Handle scroll events for infinite loading
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = table;
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoading && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadData(nextPage, true);
      }
    };

    table.addEventListener('scroll', handleScroll);
    return () => table.removeEventListener('scroll', handleScroll);
  }, [isLoading, hasMore, page]);

  const handleObjectTypeChange = (key: Key) => {
    setObjectType(key);
  };

  const getStatusVariant = (status: string) => {
    const statusMap: Record<string, 'positive' | 'negative' | 'notice' | 'info' | 'neutral'> = {
      'CUR': 'positive',    // Current
      'PLN': 'info',        // Planning
      'CPL': 'positive',    // Complete
      'IDA': 'notice',      // In Development
      'INP': 'notice',      // In Progress
      'NEW': 'info',        // New
      'CLS': 'positive',    // Closed
      'RLV': 'neutral',     // Resolved
      'QUE': 'notice'       // Queued
    };
    return statusMap[status] || 'neutral';
  };

  const renderTableRow = (item: ApiObject): JSX.Element => {
    const renderers = {
      Projects: (project: Project) => (
        <Row key={project.ID}>
          <Cell>{project.name}</Cell>
          <Cell>
            <StatusLight variant={getStatusVariant(project.status || '')}>
              {project.status}
            </StatusLight>
          </Cell>
          <Cell>{project.percentComplete}%</Cell>
          <Cell>{project.plannedCompletionDate}</Cell>
        </Row>
      ),
      Tasks: (task: Task) => (
        <Row key={task.ID}>
          <Cell>{task.name}</Cell>
          <Cell>
            <StatusLight variant={getStatusVariant(task.status || '')}>
              {task.status}
            </StatusLight>
          </Cell>
          <Cell>{task.assignedToID}</Cell>
          <Cell>{task.percentComplete}%</Cell>
        </Row>
      ),
      Issues: (issue: Issue) => (
        <Row key={issue.ID}>
          <Cell>{issue.name}</Cell>
          <Cell>
            <StatusLight variant={getStatusVariant(issue.status || '')}>
              {issue.status}
            </StatusLight>
          </Cell>
          <Cell>{issue.priority}</Cell>
          <Cell>{issue.severity}</Cell>
        </Row>
      )
    };

    const renderer = renderers[String(objectType) as keyof typeof renderers];
    return renderer ? renderer(item as any) : <Row><Cell>No data available</Cell></Row>;
  };

  const renderTableColumns = () => {
    const columns = {
      Projects: [
        <Column key="name" allowsSorting>Name</Column>,
        <Column key="status" allowsSorting>Status</Column>,
        <Column key="percentComplete" allowsSorting>Progress</Column>,
        <Column key="plannedCompletionDate" allowsSorting>Due Date</Column>
      ],
      Tasks: [
        <Column key="name" allowsSorting>Name</Column>,
        <Column key="status" allowsSorting>Status</Column>,
        <Column key="assignedToID" allowsSorting>Assigned To</Column>,
        <Column key="percentComplete" allowsSorting>Progress</Column>
      ],
      Issues: [
        <Column key="name" allowsSorting>Name</Column>,
        <Column key="status" allowsSorting>Status</Column>,
        <Column key="priority" allowsSorting>Priority</Column>,
        <Column key="severity" allowsSorting>Severity</Column>
      ]
    };

    return columns[String(objectType) as keyof typeof columns] || [];
  };

  return (
    <Provider theme={defaultTheme}>
      <View paddingX="size-300">
        <Flex direction="column" gap="size-200">
          <View>
            <Heading level={1}>Workfront API Explorer</Heading>
            <Text>Select an object type to view its data</Text>
          </View>

          <Flex gap="size-200" alignItems="center" justifyContent="space-between">
            <Picker
              label="Object Type"
              selectedKey={objectType}
              onSelectionChange={handleObjectTypeChange}
            >
              <Item key="Projects">Projects</Item>
              <Item key="Tasks">Tasks</Item>
              <Item key="Issues">Issues</Item>
            </Picker>
          </Flex>

          {isLoading && items.length === 0 && (
            <ProgressBar
              label="Loading data..."
              isIndeterminate
            />
          )}

          {error && (
            <DialogTrigger>
              <Button variant="negative">Error</Button>
              <Dialog>
                <Heading>Error</Heading>
                <Content>{error.message}</Content>
              </Dialog>
            </DialogTrigger>
          )}

          {!error && (
            <>
              <div ref={tableRef} style={{ height: '500px', overflow: 'auto' }}>
                <TableView
                  aria-label={`${String(objectType)} table`}
                  width="100%"
                  height="100%"
                  sortDescriptor={sortDescriptor}
                  onSortChange={setSortDescriptor}
                >
                  <TableHeader>
                    {renderTableColumns()}
                  </TableHeader>
                  <TableBody items={items}>
                    {renderTableRow}
                  </TableBody>
                </TableView>
              </div>
              
              {isLoading && items.length > 0 && (
                <ProgressBar
                  label="Loading more data..."
                  isIndeterminate
                />
              )}
            </>
          )}
        </Flex>
      </View>
    </Provider>
  );
}

export default App; 