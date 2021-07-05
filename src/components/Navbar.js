import React from 'react'
import { connect } from 'react-redux'
import LogoutButton from './LogoutButton';
import Link from './Link'
import ProfilePopupComponent from './ProfilePopupComponent';
import { updateProfilePicture, updateProfile } from '../actions/user-actions'

import styles from '../styles/navbar.module.scss';

import Content from '../content/navbar.json'
import SummitObject from '../content/summit.json'

import { getEnvVariable, AUTHORIZED_DEFAULT_PATH } from '../utils/envVariables';

const Navbar = class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
      showProfile: false,
      navBarActiveClass: '',
    }
  }

  toggleHamburger = () => {
    // toggle the active boolean in the state
    this.setState(
      {
        active: !this.state.active,
      },
      // after state has been updated,
      () => {
        // set the class in state for the navbar accordingly
        this.state.active
          ? this.setState({
            navBarActiveClass: `${styles.isActive}`,
          })
          : this.setState({
            navBarActiveClass: '',
          })
      }
    )
  };

  handlePictureUpdate = (picture) => {
    this.props.updateProfilePicture(picture);
  };

  handleProfileUpdate = (profile) => {
    this.props.updateProfile(profile)
  };

  handleTogglePopup = (profile) => {    
    if (profile) {
      document.body.classList.add('is-clipped');
    } else {
      document.body.classList.remove('is-clipped');
    }
    this.setState({ showProfile: profile })
  };

  render() {
    const { isLoggedUser, idpProfile, logo, idpLoading } = this.props;
    const { showProfile } = this.state;
    const { summit } = SummitObject;
    const defaultPath = getEnvVariable(AUTHORIZED_DEFAULT_PATH) ? getEnvVariable(AUTHORIZED_DEFAULT_PATH) : '/a/';

    return (
      <React.Fragment>
        <nav className={`${styles.navbar}`} role="navigation" aria-label="main navigation">
          <div className={styles.navbarBrand}>
            <Link to={isLoggedUser ? defaultPath : '/'} className={styles.navbarItem}>
              {logo &&
                <img src={logo} alt={summit.name} />
              }
            </Link>

            <a href="" role="button" className={`${styles.navbarBurger} ${styles.burger} ${this.state.navBarActiveClass}`}
              aria-label="menu" aria-expanded="false" data-target="navbarBasicExample"
              onClick={() => this.toggleHamburger()}>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </a>
          </div>

          <div id="navbarBasicExample" className={`${styles.navbarMenu} ${this.state.navBarActiveClass}`}>
            <div className={styles.navbarStart} />
            <div className={styles.navbarEnd}>
              {Content.items.map((item, index) => {
                const showItem = item.link.startsWith('/a/schedule') || !item.requiresAuth || !item.link.startsWith('/a/') || isLoggedUser;
                return (
                    item.display && showItem &&
                    <div className={styles.navbarItem} key={index}>
                      <Link to={item.link} className={styles.link}>
                        <span>{item.title}</span>
                      </Link>
                    </div>
                )
              })}
              {isLoggedUser &&
                <div className={styles.navbarItem}>
                  <img alt="" onClick={() => this.handleTogglePopup(!showProfile)} className={styles.profilePic} src={idpProfile?.picture} />
                  {showProfile &&
                    <ProfilePopupComponent
                      userProfile={idpProfile}
                      showProfile={showProfile}
                      idpLoading={idpLoading}
                      changePicture={(pic) => this.handlePictureUpdate(pic)}
                      changeProfile={(profile) => this.handleProfileUpdate(profile)}
                      closePopup={() => this.handleTogglePopup(!showProfile)}
                    />
                  }
                </div>
              }
              <LogoutButton styles={styles} isLoggedUser={isLoggedUser} />
            </div>
          </div>
        </nav>
      </React.Fragment>
    )
  }
};

export default connect(null, { updateProfilePicture, updateProfile })(Navbar)
