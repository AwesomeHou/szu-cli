const result = {
  ok: true,
  data: {
    date: '2026-06-22',
    items: [{ courseName: '图像处理' }]
  },
  meta: { command: 'course today' }
};

const command = 'szu-cli course today';
const events = [
  { type: 'thread.started', thread_id: 'fake-thread' },
  { type: 'turn.started' },
  { type: 'item.started', item: { id: 'command-1', type: 'command_execution', command, status: 'in_progress' } },
  { type: 'item.completed', item: { id: 'command-1', type: 'command_execution', command, exit_code: 0, aggregated_output: JSON.stringify(result) } },
  { type: 'item.completed', item: { id: 'message-1', type: 'agent_message', text: '今天是 2026-06-22，你有图像处理。' } },
  { type: 'turn.completed' }
];

process.stdout.write(`${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
