import SourceList from './SourceList';

export default function ChatMessage({ message }) {
  return (
    <div className={`message ${message.role}`}>
      <div>{message.text}</div>
      {message.role === 'bot' && message.sources?.length > 0 && (
        <SourceList sources={message.sources} />
      )}
    </div>
  );
}
