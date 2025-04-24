import React, { useEffect, useState } from 'react';
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
  StatusLight
} from '@adobe/react-spectrum';
import type { Key } from '@adobe/react-spectrum';
import axios from 'axios';

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

function App() {
  const [objects, setObjects] = useState<ApiObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectType, setObjectType] = useState<Key>('Projects');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'name',
    direction: 'ascending'
  });

  const handleObjectTypeChange = (key: Key) => {
    setObjectType(key);
  };

  useEffect(() => {
    const fetchObjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = String(objectType).toLowerCase();
        const response = await axios.get(`/api/${endpoint}`);
        if (response.data && response.data.data) {
          setObjects(response.data.data);
        } else {
          setError('No data received from server');
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error('Error fetching data:', err);
      }
      setLoading(false);
    };

    fetchObjects();
  }, [objectType]);

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

  const sortedObjects = React.useMemo(() => {
    if (!sortDescriptor) return objects;
    
    return [...objects].sort((a, b) => {
      let first = a[sortDescriptor.column as keyof ApiObject];
      let second = b[sortDescriptor.column as keyof ApiObject];
      
      if (sortDescriptor.direction === 'descending') {
        [first, second] = [second, first];
      }
      
      if (typeof first === 'string' && typeof second === 'string') {
        return first.localeCompare(second);
      }
      
      if (typeof first === 'number' && typeof second === 'number') {
        return first - second;
      }
      
      return 0;
    });
  }, [objects, sortDescriptor]);

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

  const renderTableRow = (item: ApiObject) => {
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
    return renderer ? renderer(item as any) : null;
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
            <Text>Total Rows: {objects.length}</Text>
          </Flex>

          {loading && (
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
                <Content>{error}</Content>
              </Dialog>
            </DialogTrigger>
          )}

          {!loading && !error && (
            <TableView
              aria-label={`${String(objectType)} table`}
              width="100%"
              height="500px"
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
            >
              <TableHeader>
                {renderTableColumns()}
              </TableHeader>
              <TableBody items={sortedObjects}>
                {renderTableRow}
              </TableBody>
            </TableView>
          )}
        </Flex>
      </View>
    </Provider>
  );
}

export default App; 