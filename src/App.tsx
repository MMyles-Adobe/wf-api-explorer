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
  Button
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

function App() {
  const [objects, setObjects] = useState<ApiObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectType, setObjectType] = useState<Key>('Projects');

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
        <Column key="name">Name</Column>,
        <Column key="status">Status</Column>,
        <Column key="percentComplete">Progress</Column>,
        <Column key="plannedCompletionDate">Due Date</Column>
      ],
      Tasks: [
        <Column key="name">Name</Column>,
        <Column key="status">Status</Column>,
        <Column key="assignedToID">Assigned To</Column>,
        <Column key="percentComplete">Progress</Column>
      ],
      Issues: [
        <Column key="name">Name</Column>,
        <Column key="status">Status</Column>,
        <Column key="priority">Priority</Column>,
        <Column key="severity">Severity</Column>
      ]
    };

    return columns[String(objectType) as keyof typeof columns] || [];
  };

  const renderTableRow = (item: ApiObject) => {
    const renderers = {
      Projects: (project: Project) => (
        <Row key={project.ID}>
          <Cell>{project.name}</Cell>
          <Cell>{project.status}</Cell>
          <Cell>{project.percentComplete}%</Cell>
          <Cell>{project.plannedCompletionDate}</Cell>
        </Row>
      ),
      Tasks: (task: Task) => (
        <Row key={task.ID}>
          <Cell>{task.name}</Cell>
          <Cell>{task.status}</Cell>
          <Cell>{task.assignedToID}</Cell>
          <Cell>{task.percentComplete}%</Cell>
        </Row>
      ),
      Issues: (issue: Issue) => (
        <Row key={issue.ID}>
          <Cell>{issue.name}</Cell>
          <Cell>{issue.status}</Cell>
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
      <div className="App">
        <Flex direction="column" gap="size-200">
          <View>
            <Heading level={1}>Workfront API Explorer</Heading>
            <Text>Select an object type to view its data</Text>
          </View>

          <Picker
            label="Object Type"
            selectedKey={objectType}
            onSelectionChange={handleObjectTypeChange}
          >
            <Item key="Projects">Projects</Item>
            <Item key="Tasks">Tasks</Item>
            <Item key="Issues">Issues</Item>
          </Picker>

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
            >
              <TableHeader>
                {renderTableColumns()}
              </TableHeader>
              <TableBody items={objects}>
                {renderTableRow}
              </TableBody>
            </TableView>
          )}
        </Flex>
      </div>
    </Provider>
  );
}

export default App; 