// Launch page 
import Button from '@mui/material/Button';
import './Launch.css';
function Launch() {
    return (
        <div>
            <h1>Launch Page</h1>
            <p>Welcome to the launch page!</p>
            <Button variant="contained" color="success" size="medium">
                Log-in
            </Button>
            <Button variant="outlined" color="error" size="medium">
                Sign-up
            </Button>
            <Button color="secondary" size="medium">Let's go!</Button>
        </div>
    );
  }
export default Launch;