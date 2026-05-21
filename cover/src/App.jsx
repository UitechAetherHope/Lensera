// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CoverPage from './CoverPage'; 
import HomeEditor from './HomeEditor'; 
import Home from './Home'; 
import Works from './Works';
import Blog, { BlogDetail, BlogPublisher } from './Blog';
import About from './About';
import Contact from './Contact';
import Login from './Login'; // 登录页
import Register from './Register'; // 注册页
import Mine from './Mine';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 封面页（/）：仅登录按钮跳/login */}
        <Route path="/" element={<CoverPage />} />
        
        {/* 登录页（/login）：仅「立即注册」跳/register */}
        <Route path="/login" element={<Login />} />
        {/* 注册页（/register）：纯展示，无额外跳转 */}
        <Route path="/register" element={<Register />} />
        
        {/* 后台布局（原有逻辑不变） */}
        <Route path="/editor" element={<HomeEditor />}>
          <Route path="home" element={<Home />} />
          <Route path="works" element={<Works />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/publish" element={<BlogPublisher />} />
          <Route path="blog/:id" element={<BlogDetail />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="user/:publicId" element={<Mine />} />
          <Route path="user" element={<Mine />} />
          <Route index element={<Navigate to="home" replace />} />
        </Route>

        {/* 兜底路由 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;