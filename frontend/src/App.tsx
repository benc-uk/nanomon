import { Route, Routes, NavLink } from 'react-router'

// Components
import Monitors from './views/Monitors'
import About from './views/About'
import Dashboard from './views/Dashboard'
import Monitor from './views/Monitor'

import { faChartLine, faEye, faList, faWrench, faEdit, faInfoCircle, faRightFromBracket, faKey } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'
import { AuthenticatedTemplate, UnauthenticatedTemplate, useIsAuthenticated, useMsal } from '@azure/msal-react'
import Edit from './views/Edit'
import Admin from './views/Admin'
import Results from './views/Results'

function App() {
  const { instance: msalApp } = useMsal()

  let authEnabled = false
  let isAuthenticated = useIsAuthenticated()

  try {
    msalApp.getConfiguration() // This will throw if auth is not enabled
    authEnabled = true
  } catch (_err) {
    authEnabled = false
    isAuthenticated = true // If auth is not enabled, we are always authenticated
  }

  function AuthRoute({ children }: { children: React.ReactNode }) {
    // Bypass auth if not enabled
    if (!authEnabled) {
      return <>{children}</>
    }

    return (
      <>
        <AuthenticatedTemplate>{children}</AuthenticatedTemplate>
        <UnauthenticatedTemplate>
          <div className="alert alert-danger fs-2" role="alert">
            <Fa icon={faKey} /> You are not authenticated!
          </div>
        </UnauthenticatedTemplate>
      </>
    )
  }

  function login() {
    msalApp
      .loginPopup()
      .then(() => {
        const accounts = msalApp.getAllAccounts()
        console.log('### Login complete, accounts found:', accounts)

        if (accounts.length > 0) {
          console.log('### Setting active account:', accounts[0].username)
          msalApp.setActiveAccount(accounts[0])
        }
      })
      .catch((err) => {
        console.warn('### Login error:', err)
      })
  }

  function logout() {
    msalApp
      .logout()
      .then(() => {
        console.log('### Logout complete')
      })
      .catch((err) => {
        console.warn('### Logout error:', err)
      })
  }

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
              <NavLink className="nav-link navbtn-main fs-6 text-dark" to="/results">
                <Fa icon={faList} fixedWidth={true} /> <span className="d-none d-md-inline">Results</span>
              </NavLink>
            </li>
            <li className={`nav-item m-1 ${!isAuthenticated ? 'd-none' : ''}`}>
              <NavLink className="nav-link navbtn-main fs-6 text-dark" to="/new">
                <Fa icon={faEdit} fixedWidth={true} /> <span className="d-none d-md-inline">New</span>
              </NavLink>
            </li>
            <li className={`nav-item m-1 ${!isAuthenticated ? 'd-none' : ''}`}>
              <NavLink className="nav-link navbtn-main fs-6 text-dark" to="/admin">
                <Fa icon={faWrench} fixedWidth={true} /> <span className="d-none d-md-inline">Admin</span>
              </NavLink>
            </li>
            <li className="nav-item m-1">
              <NavLink className="nav-link navbtn-main fs-6 text-dark" to="/about">
                <Fa icon={faInfoCircle} fixedWidth={true} /> <span className="d-none d-md-inline">About</span>
              </NavLink>
            </li>
          </ul>

          <ul className={`navbar-nav ms-auto ${authEnabled ? '' : 'd-none'}`}>
            {!isAuthenticated && (
              <li className="nav-item m-1">
                <a className="nav-link navbtn-user fs-6 text-white" onClick={login}>
                  <Fa icon={faKey} fixedWidth={true} /> <span className="d-none d-md-inline">LOGIN</span>
                </a>
              </li>
            )}

            {isAuthenticated && (
              <li className="nav-item m-1">
                <a className="nav-link navbtn-user fs-6 text-white" onClick={logout}>
                  <Fa icon={faRightFromBracket} fixedWidth={true} /> <span className="d-none d-md-inline">LOGOUT</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </nav>

      <div className="container pt-3">
        <Routes>
          <Route path="/" element={<Monitors />} />
          <Route path="/monitors" element={<Monitors />} />
          <Route path="/monitor/:id" element={<Monitor isAuth={isAuthenticated} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/results" element={<Results />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="/edit/:id"
            element={
              <AuthRoute>
                <Edit />
              </AuthRoute>
            }
          />
          <Route
            path="/new"
            element={
              <AuthRoute>
                <Edit />
              </AuthRoute>
            }
          />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </>
  )
}

export default App
