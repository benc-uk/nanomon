import { Route, Routes, NavLink } from 'react-router'

// Components
import Monitors from './Monitors'
import About from './About'
import Dashboard from './Dashboard'
import Monitor from './Monitor'

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
                <i className="fa fa-fw fa-line-chart"></i> <span className="d-none d-md-inline">Monitors</span>
              </NavLink>
            </li>
            <li className="nav-item m-1">
              <NavLink className="nav-link navbtn-main fs-6 text-dark" to="/dashboard">
                <i className="fa fa-fw fa-eye"></i> <span className="d-none d-md-inline">Dashboard</span>
              </NavLink>
            </li>
            <li className="nav-item m-1">
              <a className="nav-link navbtn-main fs-6 text-dark" href="#results">
                <i className="fa fa-fw fa-list-alt"></i> <span className="d-none d-md-inline">Results</span>
              </a>
            </li>
            <li className="nav-item m-1">
              <a className="nav-link navbtn-main fs-6 text-dark" href="#edit/new">
                <i className="fa fa-fw fa-edit"></i> <span className="d-none d-md-inline">New</span>
              </a>
            </li>
            <li className="nav-item m-1">
              <a className="nav-link navbtn-main fs-6 text-dark" href="#admin">
                <i className="fa fa-fw fa-wrench"></i> <span className="d-none d-md-inline">Admin</span>
              </a>
            </li>
            <li className="nav-item m-1">
              <NavLink className="nav-link navbtn-main fs-6 text-dark" to="/about">
                <i className="fa fa-fw fa-info-circle"></i> <span className="d-none d-md-inline">About</span>
              </NavLink>
            </li>
          </ul>

          <ul className="navbar-nav ms-auto">
            <li className="nav-item m-1">
              <a className="nav-link navbtn-user fs-6 text-white">
                <i className="fa fa-fw fa-user"></i>
                <span className="d-none d-md-inline">LOGIN</span>
              </a>
            </li>
            <li className="nav-item m-1">
              <a className="nav-link navbtn-user fs-6 text-white">
                <i className="fa fa-fw fa-right-from-bracket"></i>
                <span className="d-none d-md-inline">LOGOUT</span>
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
