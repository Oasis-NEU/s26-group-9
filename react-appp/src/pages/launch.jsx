// Launch page 
import Button from '@mui/material/Button';
import './Launch.css';
function Launch() {
    return (
        <div>
            <h1>ProductiviTea!</h1>
            <p>Welcome to the launch page!</p>
            <Button 
            variant="contained" 
            sx={{
                bgcolor: '#99836F', // Custom background color
                '&:hover': {
                bgcolor: '#746455', // Custom hover background color
                },
                '&:focus': {
                outline: 'none',
                },
                '&.Mui-focusVisible': {
                outline: '000000',
                },
            }} 
            size="medium">
                Log-in
            </Button>
            <Button variant="contained" sx={{
                bgcolor: '#99836F', 
                '&:hover': {
                    bgcolor: '#746455', 
                },
            }} size="medium">
                Sign-up
            </Button>
            <Button color="contained" sx={{
                bgcolor: '#99836F', 
                '&:hover': {
                    bgcolor: '#746455', 
                },
            }}size="medium">Let's go!</Button>
        </div>
    );
}

export default Launch;