import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DocPage from './components/DocPage'
import { pages } from './pages'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {pages.map(({ path, content }) => (
          <Route key={path} path={path} element={<DocPage content={content} />} />
        ))}
        <Route path="*" element={<DocPage content="# 404\n\nPage not found." />} />
      </Route>
    </Routes>
  )
}
