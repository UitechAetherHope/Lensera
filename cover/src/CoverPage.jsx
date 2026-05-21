import LiquidChrome from './components/LiquidChrome';
import './App.css';
import blogCover from './assets/blog-cover.jpg';
import { useNavigate } from 'react-router-dom';

function App() {
    const navigate = useNavigate();
  return (
    <>
      {/* 全屏背景 */}
      <div className="bg">
        <LiquidChrome
          baseColor={[0.141, 0.078, 0.247]}  // #24143f
          speed={0.83}                 // Adjust speed for the wave effect
          amplitude={0.32}             // Adjust amplitude for intensity
          interactive={true}           // Enable mouse interaction for ripple effects
          frequencyX={3}               // Control horizontal frequency of the waves
          frequencyY={3}               // Control vertical frequency of the waves
        />
      </div>

      {/* 你要的内容，随便加 */}
      <div className="content">
        {/* 导航栏 */}
        <div className="navbar">
          <div className="brand">
            <span className="brand-text">Lensera</span>
            <img
              className="brand-image"
              src={blogCover}
              alt="Lensera"
            />
          </div>
          <div className="links">

          </div>
          <button 
          onClick={() => navigate('/login')}
          >登录</button>
        </div>

        {/* 中间文字 */}
        <div className="center-content">
          <div className="tag">
            <span>NEW</span>
            shots added
          </div>
          <h1>旅途与光影，都在这里存档！</h1>
          <div className="buttons">
            <button 
            className="primary"
            onClick={()=> navigate('/editor/home')}
            >进入首页</button>
            <button
              type="button"
              className="secondary"
              onClick={() => navigate('/editor/contact')}
            >
              联系我们
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;