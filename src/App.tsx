import ResponsiveBox, { Row, Col, Item, Location } from 'devextreme-react/responsive-box';
import CwAdminLogin from './CwAdminLogin.tsx';
import NewsFeed from './NewsFeed';
import './App.css';
import BuildFooter from './components/BuildFooter';
import 'devextreme/dist/css/dx.light.css';

function App() {
  const screen = (width: number) => (width < 700 ? 'sm' : 'lg');
  return (
    <div className="app-root">
      <ResponsiveBox
        singleColumnScreen="sm"
        screenByWidth={screen}
        className="app-responsive-box"
      >
        <Row ratio={1} />
        <Col ratio={30} />
        <Col ratio={70} />
        <Item>
          <Location row={0} col={0} />
          <div className="app-left-panel">
            <CwAdminLogin />
          </div>
        </Item>
        <Item>
          <Location row={0} col={1} />
          <div className="app-right-panel">
            <NewsFeed />
          </div>
        </Item>
      </ResponsiveBox>
      <BuildFooter />
    </div>
  );
}

export default App
