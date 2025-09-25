
import './NewsFeed.css';

const ADVERT_URL = '/Advert/index.html';
const NewsFeed = () => {
  return (
    <div className="newsfeed-notion-container" style={{ width: '100%', height: '100%', minHeight: 600 }}>
      <iframe
        src={ADVERT_URL}
        title="CalWin Solutions Info"
        style={{ width: '100%', height: '95vh', border: 'none'}}
        allowFullScreen
      />
    </div>
  );
};

export default NewsFeed;
