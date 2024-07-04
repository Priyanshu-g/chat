import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Footer,
  Grommet,
  grommet,
  Form,
  TextInput,
  Text,
  Layer,
  Spinner,
  Select,
  Tabs,
  Tab,
  Grid,
} from 'grommet';
import { Moon, Sun } from 'grommet-icons';
import { deepMerge } from 'grommet/utils';

import { Chat } from './components/chat.js';

import { socket } from './socket';

const theme = deepMerge(grommet, {
  global: {
    colors: {
      brand: '#228BE6',
    },
    font: {
      family: 'Roboto',
      size: '18px',
      height: '20px',
    },
  },
});

function App() {
  const [dark, setDark] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [getName, setGetName] = useState(true);
  const [name, setName] = useState('');

  const [waitingOnName, setWaitingOnName] = useState(false);
  const [errorMessageName, setErrorMessageName] =
    useState('Enter Name Here...');

  const [activeUsers, setActiveUsers] = useState([]);

  const [selectedUser, setSelectedUser] = useState('');

  const [activeBottom, setActiveBottom] = useState('bottom0');

  const [activeTab, setActiveTab] = useState(0);

  const [holdName, setHoldName] = useState('');
  const [initalName, setInitialName] = useState(false);

  const nameRef = useRef(name);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const [privateChats, setPrivateChats] =  useState( new Map() ); // new Map();

  const privateChatsRef = useRef(privateChats);

  useEffect(() => {
    privateChatsRef.current = privateChats;
  }, [privateChats]);

  useEffect(() => {
    function onGetServerMessage(value) {
      // Add message to messages
      setMessages((previous) => [
        ...previous,
        { position: 'center', message: value, name: 'Server' },
      ]);
    }

    function onGetMessage(value) {
      if (!value.sender)
        setMessages((previous) => [
          ...previous,
          { position: 'start', message: value.message, name: value.name },
        ]);
      else {
        if (!privateChatsRef.current.has(value.sender)) {
          setPrivateChats(new Map(privateChatsRef.current.set(value.sender, [])));
        }
        
        const updatedChats = new Map(privateChatsRef.current);
        updatedChats.get(value.sender).push({
          position: 'start',
          message: value.message,
          name: value.name,
        });
        
        setPrivateChats(updatedChats);
      }
    }

    function receiveNameApproval(value) {
      setGetName(false);
      setInitialName(true);
      setName(value);
      setWaitingOnName(false);
      setErrorMessageName('Set New Name Here...');
    }

    function receiveNameRejection(value) {
      setWaitingOnName(false);
      setErrorMessageName(value.message);
      if (value.isFirst) socket.disconnect();
    }

    function getUsers(value) {
      // Set active users as value sorted
      console.log('Current name:', nameRef.current);
      console.log('Users before filtering:', value);
      setActiveUsers(value.sort().filter((user) => user !== nameRef.current));
    }

    socket.disconnect();

    socket.on('receive message', onGetMessage);
    socket.on('receive server message', onGetServerMessage);
    socket.on('get approval', receiveNameApproval);
    socket.on('get rejection', receiveNameRejection);
    socket.on('get users', getUsers);

    return () => {
      socket.off('receive message', onGetMessage);
      socket.off('receive server message', onGetServerMessage);
      socket.off('get approval', receiveNameApproval);
      socket.off('get rejection', receiveNameRejection);
      socket.off('get users', getUsers);
      socket.disconnect();
    };
  }, []);

  function onSubmit(event) {
    event.preventDefault();
    if (message) { // ONLY ADD RECIPIENT AND SENDER IF PRIVATE
      console.log('active tab: ' + activeTab);
      console.log('keys: ' + Array.from(privateChats.keys()));
      if(activeTab){ // if activetab is not 0 then it is a private message
        socket.emit('send message', { name: name, message: message, recipient: Array.from(privateChats.keys())[activeTab - 1]  });

        const updatedChats = new Map(privateChatsRef.current);
        updatedChats.get(Array.from(privateChats.keys())[activeTab - 1]).push({
          position: 'end',
          message: message,
          name: name,
        });
        
        setPrivateChats(updatedChats);

      }
      else{
        socket.emit('send message', { name: name, message: message });
        setMessages((previous) => [
          ...previous,
          { position: 'end', message: message, name: name },
        ]);
      }
      setMessage('');
      // Scroll to box with id bottom
      document
        .getElementById(activeBottom)
        .scrollIntoView({ behavior: 'smooth' });
    }
  }

  function gotName(event) {
    event.preventDefault();
    if (holdName) {
      socket.connect();
      setWaitingOnName(true);
      socket.emit('set name', holdName);
      requestUsers();
    }
    setHoldName('');
  }

  function openChat(option) {
    console.log('open chat: ' + option);
    setSelectedUser('');
    if(!privateChats.has(option)){
      setPrivateChats(prevPrivateChats => {
        const updatedChats = new Map(prevPrivateChats);
        updatedChats.set(option, []);
        return updatedChats;
      });
      // This should be the newest active tab
      console.log('setting tab: ' + (privateChats.size + 1));
      setActiveTab(privateChats.size + 1);
    } else
    setActiveTab(Array.from(privateChats.keys()).indexOf(option) + 1);
  }

  function requestUsers() {
    socket.emit('requesting users');
  }

  function handleTabChange(event) {
    setActiveTab(event);
    setActiveBottom('bottom' + event);
  }

  return (
    <Grommet theme={theme} full themeMode={dark ? 'dark' : 'light'}>
      {getName && (
        <Layer
          margin="medium"
          pad="medium"
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          onClickOutside={() => {
            // This is false on load, but after the first name confirm it is true
            if (initalName) {
              setGetName(false);
            }
          }}
        >
          <Form onSubmit={gotName} style={{ margin: '20px', display: 'flex', justifyContent: 'center' }}>
            <Box direction="row" gap="small" 
                  style={{ width: '100%' }}>
              <Box flex >
                <TextInput
                  onChange={(e) => {
                    setHoldName(e.target.value);
                  }}
                  value={holdName}
                  placeholder={errorMessageName}
                />
              </Box>
              <Button type="submit" disabled={waitingOnName}>
                {waitingOnName ? <Spinner /> : 'Submit'}
              </Button>
            </Box>
          </Form>
        </Layer>
      )}
      <Box fill>
        <Box elevation="small">
          <Grid
            as="header"
            pad="medium"
            gap="small"
            flex={false}
            rows={['xxxsmall']}
            columns={['1/3', '1/3', '1/3']}
            areas={[
              { name: 'F', start: [0, 0], end: [0, 0] },
              { name: 'S', start: [1, 0], end: [1, 0] },
              { name: 'T', start: [2, 0], end: [2, 0] },
            ]}
            style={{ verticalAlign: 'middle' }}
          >
            <Box gridArea="F" align="start">
              <Select
                options={activeUsers}
                placeholder="Open Private Chat"
                value={selectedUser}
                onOpen={() => requestUsers()}
                onChange={({ option }) => openChat(option)}
              />
            </Box>
            <Box gridArea="S" align="center">
              <Button
                a11yTitle={
                  dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'
                }
                icon={dark ? <Moon /> : <Sun />}
                onClick={() => setDark(!dark)}
                tip={{
                  content: (
                    <Box
                      pad="small"
                      round="small"
                      background={dark ? 'dark-1' : 'light-3'}
                    >
                      {dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    </Box>
                  ),
                  plain: true,
                }}
                background="background-contrast"
                round="small"
                pad="small"
              />
            </Box>
            <Box gridArea="T" align="end" style={{ paddingRight: '10px' }}>
              <Box background="background-contrast" round="small" pad="small">
                <Text
                  size="medium"
                  onClick={() => {
                    setGetName(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {getName ? 'Welcome' : name}
                </Text>
              </Box>
            </Box>
          </Grid>
        </Box>
        <Box as="main" flex pad="medium">
          <Tabs flex activeIndex={activeTab} onActive={handleTabChange}>
            <Tab title="Global Chat">
              <Chat messages={messages} bottomId="bottom0" />
            </Tab>
            {privateChats.size > 0 &&
              Array.from(privateChats).map(([key, value], index) => (
                <Tab title={key} >
                  <Chat messages={value} bottomId={'bottom' + (index + 1)} />
                </Tab>
              ))}
          </Tabs>
        </Box>
        <Footer background="background-contrast" pad="small" justify="center">
          <Form onSubmit={onSubmit} style={{ width: '100%' }}>
            <Box direction="row" gap="small">
              <Box flex>
                <TextInput
                  width="100%"
                  onChange={(e) => setMessage(e.target.value)}
                  value={message}
                  placeholder="Message..."
                />
              </Box>
              <Button type="submit">Submit</Button>
            </Box>
          </Form>
        </Footer>
      </Box>
    </Grommet>
  );
}

export default App;
