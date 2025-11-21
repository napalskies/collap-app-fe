import { useEffect, useRef, useState, useContext } from 'react';
import axios from 'axios';

import { debounce, set, throttle } from 'lodash';
import { SignalRContext } from '../providers/SignalRProvider';

function DocumentComponent(props) {
  const { connectionContext, connectionReady } = useContext(SignalRContext);
  const documentId = props.documentId;
  const [inputText, setInputText] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userTyping, setUserTyping] = useState('');
  const inputRef = useRef(null);

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
        await connectionContext.invoke('JoinDocument', documentId);
      }
      console.log(connectionContext.connectionId);
      console.log(getRandomColor(connectionContext.connectionId));
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
        await connectionContext.invoke('SendChange', documentId, newValue);
      } catch (err) {
        console.error('Invoke failed: ', err);
      }
    }, 200),
  );

  const indicateTypingStart = useRef(
    throttle(async () => {
      await connectionContext.invoke('UserIsTyping', documentId, true);
    }, 1000),
  ).current;

  const indicateTypingEnd = useRef(
    debounce(async () => {
      await connectionContext.invoke('UserIsTyping', documentId, false);
    }, 1500),
  ).current;

  const onType = () => {
    indicateTypingStart();
    indicateTypingEnd();
  };

  useEffect(() => {
    return () => {
      indicateTypingStart.cancel();
      indicateTypingEnd.cancel();
    };
  }, []);

  useEffect(() => {
    const debouncedFn = handleDocumentChanged.current;
    const onDocumentChanged = (change) => {
      setInputText(change);
    };

    connectionContext.on('DocumentChanged' + documentId, onDocumentChanged);

    return () => {
      debouncedFn.cancel();
      connectionContext.off('DocumentChanged' + documentId, onDocumentChanged);
    };
  }, [connectionContext, documentId]);

  useEffect(() => {
    const onUserConnected = (connectionId) => {
      console.log(`User ${connectionId} connected!`);
    };
    const onUserDisconnected = (connectionId) => {
      console.log(`User ${connectionId} disconnected!`);
    };

    connectionContext.on('UserConnected', onUserConnected);
    connectionContext.on('UserDisconnected', onUserDisconnected);

    return () => {
      connectionContext.off('UserConnected', onUserConnected);
      connectionContext.off('UserDisconnected', onUserDisconnected);
    };
  }, [connectionContext]);

  useEffect(() => {
    const onActiveUsersUpdated = (users) => {
      setActiveUsers(users);
    };
    connectionContext.on('ActiveUsersUpdated' + documentId, onActiveUsersUpdated);

    return () => {
      connectionContext.off('ActiveUsersUpdated' + documentId, onActiveUsersUpdated);
    };
  }, [documentId, connectionContext]);

  useEffect(() => {
    return () => {
      if (connectionContext.state === 'Connected') {
        const onLeaveDocument = async () => {
          await connectionContext.invoke('LeaveDocument', documentId);
        };
        onLeaveDocument().catch((err) => console.error('Error in invoking LeaveDocument:', err));
      }
    };
  }, [connectionContext, documentId]);

  useEffect(() => {
    const onOtherUsersTyping = (userId, isTyping) => {
      console.log(`User ${userId} is typing: ${isTyping}`);
      setUserTyping(userId);
      setIsTyping(isTyping);
    };
    connectionContext.on('OtherUserTyping' + documentId, onOtherUsersTyping);

    return () => {
      connectionContext.off('OtherUserTyping' + documentId, onOtherUsersTyping);
    };
  }, [documentId, connectionContext]);

  const getRandomColor = (user) => {
    var hash = 0;
    for (var i = 0; i < user.length; i++) {
      hash = user.charCodeAt(i) + ((hash << 5) - hash);
    }
    var color = (hash & 0x00fffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - color.length) + color;
  };

  // useEffect(() => {
  //   const onCursorPositionReceived = (user, pos) => {
  //     console.log(`position received from ${user}; : ${pos}`);
  //     inputRef.current[pos].background = '#3FFA';
  //   };
  //   connectionContext.on('CursorPositionReceived' + documentId, onCursorPositionReceived);

  //   return () => {
  //     connectionContext.off('CursorPositionReceived' + documentId, onCursorPositionReceived);
  //   };
  // }, [documentId, connectionContext]);

  // const sendCursorPosition = (pos) => {
  //   if (connectionContext && connectionContext.state === 'Connected') {
  //     connectionContext.invoke('SendCursorPosition', documentId, pos);
  //   }
  // };

  return (
    <>
      <input
        ref={inputRef}
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          handleDocumentChanged.current(e.target.value);
          onType();
        }}
        onClick={(e) => {
          console.log(inputRef.current.selectionStart);
          //sendCursorPosition(inputRef.current.selectionStart);
        }}
      ></input>
      {isTyping && <p>{userTyping} is typing...</p>}
      <div className="active-users-footer">
        {activeUsers &&
          activeUsers.length > 0 &&
          activeUsers.map((user) => (
            <p key={user} style={{ background: getRandomColor(user) }}>
              {user}
            </p>
          ))}
      </div>
    </>
  );
}

export default DocumentComponent;
