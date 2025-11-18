import React, { useEffect, useRef, useState, useContext } from 'react';
import axios from 'axios';

import { debounce, forEach } from 'lodash';
import { SignalRContext } from '../providers/SignalRProvider';

function DocumentComponent(props) {
  const { connectionContext, connectionReady } = useContext(SignalRContext);
  const documentId = props.documentId;
  const [inputText, setInputText] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    async function initInput() {
      await axios.get(`https://localhost:5200/api/document/${documentId}`).then((response) => {
        setInputText(response.data.content);
      });
    }
    initInput();
  }, [documentId]);

  useEffect(() => {
    if (!connectionContext || !connectionReady) return;

    const joinWhenConnected = async () => {
      await connectionReady;
      if (connectionContext.state === 'Connected') {
        console.log(connectionContext.state);
        await connectionContext.invoke('JoinDocument', documentId);
      }
      console.log('New user has joined document.');
    };

    joinWhenConnected().catch((err) => console.error('Error in invoking JoinDocument:', err));
  }, [connectionContext, documentId, connectionReady]);

  useEffect(() => {
    if (!connectionContext) return;

    const onReconnect = () => {
      if (connectionContext.state === 'Connected') {
        connectionContext
          .invoke('JoinDocument', documentId)
          .catch((err) => console.error('JoinDocument failed:', err));
      }
    };

    connectionContext.on('reconnected', onReconnect);

    return () => {
      connectionContext.off('reconnected', onReconnect);
    };
  }, [connectionContext, documentId]);

  const handleDocumentChanged = useRef(
    debounce(async (newValue) => {
      try {
        console.log('Invoking SendChange with value: ', newValue);
        await connectionContext.invoke('SendChange', documentId, newValue);
      } catch (err) {
        console.error('Invoke failed: ', err);
      }
    }, 200),
  );

  useEffect(() => {
    console.log(documentId + ' mounted');
    const debouncedFn = handleDocumentChanged.current;
    const onDocumentChanged = (change) => {
      console.log(change);
      setInputText(change);
    };

    connectionContext.on('DocumentChanged' + documentId, onDocumentChanged);

    return () => {
      console.log('Cleaning up handlers');

      debouncedFn.cancel();
      connectionContext.off('DocumentChanged' + documentId, onDocumentChanged); //, onDocumentChanged);
      console.log(documentId + ' unmounted');
    };
  }, [connectionContext, documentId]);

  useEffect(() => {
    const onUserConnected = (connectionId) => {
      // console.log(activeUsers);
      // setActiveUsers( [...activeUsers, connectionId] );
      console.log(`User ${connectionId} connected!`);
      // console.log(activeUsers);
    };
    const onUserDisconnected = (connectionId) => {
      console.log(`User ${connectionId} disconnected!`);
      // console.log(activeUsers);
      // if(activeUsers.find(connectionId))
      //     setActiveUsers(activeUsers.filter(user => user !== connectionId));
    };

    connectionContext.on('UserConnected', onUserConnected);
    connectionContext.on('UserDisconnected', onUserDisconnected);

    return () => {
      connectionContext.off('UserConnected', onUserConnected);
      connectionContext.off('UserDisconnected', onUserDisconnected);
    };
  }, [connectionContext]);

  useEffect(() => {
    console.log('Active users updated: ', activeUsers);
    const onActiveUsersUpdated = (users) => {
      console.log('Received active users: ', users);
      setActiveUsers(users);
    };
    connectionContext.on('ActiveUsersUpdated' + documentId, onActiveUsersUpdated);

    return () => {
      connectionContext.off('ActiveUsersUpdated' + documentId, onActiveUsersUpdated);
    };
  }, [activeUsers, documentId, connectionContext]);

  useEffect(() => {
    return () => {
      console.log(connectionContext.state);
      if (connectionContext.state === 'Connected') {
        console.log('Goodbye im unmounting' + documentId);
        const onLeaveDocument = async () => {
          await connectionContext.invoke('LeaveDocument', documentId);
          console.log('Just invoked LeaveDocument');
        };
        onLeaveDocument().catch((err) => console.error('Error in invoking LeaveDocument:', err));
      }
    };
  }, [connectionContext, documentId]);

  return (
    <>
      <input
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          handleDocumentChanged.current(e.target.value);
        }}
      ></input>
      <div className="active-users-footer">
        {activeUsers &&
          activeUsers.length > 0 &&
          activeUsers.map((user) => <p key={user}>{user}</p>)}
      </div>
    </>
  );
}

export default DocumentComponent;
