// Launch page 
import Button from '@mui/material/Button';
import './Launch.css';
function Launch() {
    return (
        <div className="launch-container">
            <h1>ProductiviTea!</h1>
            <p>Welcome to the launch page!</p>
            <Button className = "myButtonLogIn"
                variant="contained"
                sx={{
                    padding: '100px 20px',
                    bgcolor: '#99836F', // Custom background color
                    '&:hover': {
                        bgcolor: '#746455', // Custom hover background color
                    },
                    '&.Mui-focusVisible': {
                        outline: '2px solid #000000',
                    },
                }}
                size="medium">
                Log-in
            </Button>
            <Button className = "myButtonSignUp" 
            variant="contained" sx={{
            padding: '10px 20px',
            bgcolor: '#99836F',
                '&:hover': {
                    bgcolor: '#746455',
                }, 
                '&:focus': {
                        outline: 'none',
                    },
                    '&.Mui-focusVisible': {
                        outline: '2px #000000',
                    },
            }} >
                Sign-up
            </Button>
            <Button 
            className = "myButtonLetsGo"
            variant="contained" sx={{
                padding: '100px 20px',
                bgcolor: '#99836F',
                '&:hover': {
                    bgcolor: '#746455',
                },
                '&:focus': {
                        outline: 'none',
                    },
                    '&.Mui-focusVisible': {
                        outline: '2px #000000',
                    },
            }} size="medium">Let's go!</Button>
        </div>
    );
}

export default Launch;