import os

# Define the paths for the directories and the counter file
UPLOAD_FOLDER = './uploads/'
MERGED_FOLDER = './merged/'
COUNTER_FILE = './merge_counter.txt'

# Get the password from an environment variable
PASSWORD = os.getenv('DATABASE_PASSWORD', 'default_password')  # Replace 'default_password' with a fallback password if needed

def clear_directory(directory):
    """Delete all files in the specified directory."""
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)
            print(f"Deleted {file_path}")

def reset_counter():
    """Reset the merge counter to 0."""
    with open(COUNTER_FILE, 'w') as f:
        f.write('0')
    print("Reset merge counter to 0")

def clean_database(reset_counter_flag=True):
    """Clear the upload and merged folders and optionally reset the merge counter."""
    # Password check
    password = input("Enter the password to proceed with database manipulation: ")
    if password != PASSWORD:
        print("Incorrect password. Aborted.")
        return
    
    # User confirmation
    confirm = input("Are you sure you want to clear the upload and merged folders? This action cannot be undone. (yes/no): ")
    if confirm.lower() != 'yes':
        print("Aborted.")
        return
    
    # Clear the upload folder
    clear_directory(UPLOAD_FOLDER)
    # Clear the merged folder
    clear_directory(MERGED_FOLDER)
    
    # Optionally reset the counter
    if reset_counter_flag:
        reset_counter()

if __name__ == "__main__":
    # Allow the user to choose whether to reset the counter
    reset_counter_choice = input("Do you want to reset the merge counter to 0? (yes/no): ")
    reset_counter_flag = reset_counter_choice.lower() == 'yes'
    
    clean_database(reset_counter_flag)
    print("Database manipulation complete.")
