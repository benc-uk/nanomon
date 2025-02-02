import { Route, Routes, NavLink } from 'react-router'

// Components
import Monitors from './Monitors'
import About from './About'
import Dashboard from './Dashboard'
import Monitor from './Monitor'

import { faChartLine, faEye, faList, faWrench, faEdit, faInfoCircle, faRightFromBracket, faKey } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'

function App() {
  return (
    <>
      <nav className="navbar navbar-expand navbar-dark bg-primary sticky-top">
        <div className="container-fluid">
          <NavLink className="navbar-brand" to="/">
            <img src="/icon.png" />
            <span className="d-none d-md-inline">NanoMon</span>
          </NavLink>

          <ul className="navbar-nav me-auto">
            <li className="nav-item m-1">
              <NavLink className="nav-link fs-6 navbtn-main text-dark" to="/monitors">
                <Fa icon={faChartLine} fixedWidth={true} /> <span className="d-none d-md-inline">Monitors</span>
              </NavLink>
            </li>
            <li className="nav-item m-1">
              <NavLink className="nav-link navbtn-main fs-6 text-dark" to="/dashboard">
                <Fa icon={faEye} fixedWidth={true} /> <span className="d-none d-md-inline">Dashboard</span>
              </NavLink>
            </li>
            <li className="nav-item m-1">
              <a className="nav-link navbtn-main fs-6 text-dark" href="#results">
                <Fa icon={faList} fixedWidth={true} /> <span className="d-none d-md-inline">Results</span>
              </a>
            </li>
            <li className="nav-item m-1">
              <a className="nav-link navbtn-main fs-6 text-dark" href="#edit/new">
                <Fa icon={faEdit} fixedWidth={true} /> <span className="d-none d-md-inline">New</span>
              </a>
            </li>
            <li className="nav-item m-1">
              <a className="nav-link navbtn-main fs-6 text-dark" href="#admin">
                <Fa icon={faWrench} fixedWidth={true} /> <span className="d-none d-md-inline">Admin</span>
              </a>
            </li>
            <li className="nav-item m-1">
              <NavLink className="nav-link navbtn-main fs-6 text-dark" to="/about">
                <Fa icon={faInfoCircle} fixedWidth={true} /> <span className="d-none d-md-inline">About</span>
              </NavLink>
            </li>
          </ul>

          <ul className="navbar-nav ms-auto">
            <li className="nav-item m-1">
              <a className="nav-link navbtn-user fs-6 text-white">
                <Fa icon={faKey} fixedWidth={true} /> <span className="d-none d-md-inline">LOGIN</span>
              </a>
            </li>
            <li className="nav-item m-1">
              <a className="nav-link navbtn-user fs-6 text-white">
                <Fa icon={faRightFromBracket} fixedWidth={true} /> <span className="d-none d-md-inline">LOGOUT</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="container pt-3">
        <Routes>
          <Route path="/" element={<Monitors />} />
          <Route path="/monitors" element={<Monitors />} />
          <Route path="/monitor/:id" element={<Monitor />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </>
  )
}

export default App
