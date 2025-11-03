import React, { useState } from 'react';
import type { CustomAppProps } from '../../types/custom-app';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';
import { List } from 'devextreme-react/list';
import './ExampleTodoApp.css';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export const ExampleTodoAppComponent: React.FC<CustomAppProps> = ({
  workspace,
  instanceId
}) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');

  const addTodo = () => {
    if (!newTodoText.trim()) return;
    
    const newTodo: TodoItem = {
      id: `${instanceId}-${Date.now()}`,
      text: newTodoText,
      completed: false,
      createdAt: new Date()
    };
    
    setTodos([...todos, newTodo]);
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="example-todo-app">
      <div className="todo-header">
        <h2>Todo List</h2>
        <p className="workspace-info">Workspace: {workspace?.name || 'None'}</p>
      </div>

      <div className="todo-input-section">
        <TextBox
          value={newTodoText}
          onValueChanged={(e) => setNewTodoText(e.value)}
          placeholder="Enter new todo..."
          onEnterKey={addTodo}
          stylingMode="outlined"
        />
        <Button
          text="Add"
          icon="plus"
          type="default"
          onClick={addTodo}
          disabled={!newTodoText.trim()}
        />
      </div>

      <div className="todo-list-section">
        {todos.length === 0 ? (
          <div className="empty-state">
            <p>No todos yet. Add one to get started!</p>
          </div>
        ) : (
          <List
            dataSource={todos}
            itemRender={(todo: TodoItem) => (
              <div className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span className="todo-text">{todo.text}</span>
                <Button
                  icon="trash"
                  onClick={() => deleteTodo(todo.id)}
                  stylingMode="text"
                />
              </div>
            )}
          />
        )}
      </div>

      <div className="todo-footer">
        <p>Total: {todos.length} | Completed: {todos.filter(t => t.completed).length}</p>
      </div>
    </div>
  );
};
