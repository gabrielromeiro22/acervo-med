import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Questoes from './pages/Questoes'
import Simulados from './pages/Simulados'
import MinhasProvas from './pages/MinhasProvas'
import Grade from './pages/Grade'
import Imprimir from './pages/Imprimir'
import SimuladoRun from './pages/SimuladoRun'
import Flashcards from './pages/Flashcards'
import Estatisticas from './pages/Estatisticas'
import Notas from './pages/Notas'
import Materiais from './pages/Materiais'
import Busca from './pages/Busca'
import Importar from './pages/Importar'
import Acervo from './pages/Acervo'
import ProvasAnteriores from './pages/ProvasAnteriores'
import ProvaConfig from './pages/ProvaConfig'
import Resumos from './pages/Resumos'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/imprimir/:disciplina" element={<Imprimir />} />
      <Route path="/app" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="questoes" element={<Questoes />} />
        <Route path="simulados" element={<Simulados />} />
        <Route path="simulados/:id" element={<SimuladoRun />} />
        <Route path="minhas-provas" element={<MinhasProvas />} />
        <Route path="grade" element={<Grade />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="estatisticas" element={<Estatisticas />} />
        <Route path="notas" element={<Notas />} />
        <Route path="materiais" element={<Materiais />} />
        <Route path="materiais/:id" element={<Materiais />} />
        <Route path="busca" element={<Busca />} />
        <Route path="importar" element={<Importar />} />
        <Route path="acervo" element={<Acervo />} />
        <Route path="provas" element={<ProvasAnteriores />} />
        <Route path="resumos" element={<Resumos />} />
        <Route path="provas/:arquivo" element={<ProvaConfig />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
