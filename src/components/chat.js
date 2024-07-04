import {
    Box,
    Text,
} from 'grommet';

export function Chat( { messages, bottomId } ) {
    return (
        <Box
          flex
          height={'100%'}
          justify="end"
          style={{ height: '100%' }}

        >
          <Box
            gap="medium"
            style={{
              overflowY: 'scroll',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              display: 'block',
            }}

          >
            {messages.map((message) => (
              <Box
                align={message.position}
                width="100%"
                flex={{ shrink: 0 }}
                key={Math.random()}
              >
                <Box
                  background="background-contrast"
                  round="small"
                  pad="small"
                >
                  <Text>
                    {message.position === 'start'
                      ? message.name + ': '
                      : ''}
                    {message.message}
                  </Text>
                </Box>
              </Box>
            ))}
            <Box height="0px" id={bottomId}></Box>
          </Box>
        </Box>
    );
}