import tkinter as tk
from tkinter import ttk, scrolledtext
import requests
import json

AUTH_URL = "https://replace-with-auth.url/dev"
API_URL = "https://replace-with-api.url/dev"

root = tk.Tk()
root.title("Movie Reviews API Tester")
root.resizable(False, False)

# CONFIG

config_frame = ttk.LabelFrame(root, text="Config", padding=8)
config_frame.grid(row=0, column=0, padx=10, pady=8, sticky="ew")

ttk.Label(config_frame, text="Auth API:").grid(row=0, column=0, sticky="w")
auth_url_entry = ttk.Entry(config_frame, width=55)
auth_url_entry.insert(0, AUTH_URL)
auth_url_entry.grid(row=0, column=1, padx=6)

ttk.Label(config_frame, text="Movies API:").grid(row=1, column=0, sticky="w", pady=(6,0))
api_url_entry = ttk.Entry(config_frame, width=55)
api_url_entry.insert(0, API_URL)
api_url_entry.grid(row=1, column=1, padx=6, pady=(6,0))

ttk.Label(config_frame, text="Token:").grid(row=2, column=0, sticky="w", pady=(6,0))
token_display = tk.StringVar(value="(not logged in)")
token_entry = ttk.Entry(config_frame, textvariable=token_display, width=50)
token_entry.grid(row=2, column=1, padx=6, pady=(6,0))
ttk.Button(config_frame, text="Clear", command=lambda: token_display.set("")).grid(row=2, column=2, pady=(6,0))

# OUTPUT BOX

output_frame = ttk.LabelFrame(root, text="Response", padding=8)
output_frame.grid(row=2, column=0, padx=10, pady=(0,10), sticky="ew")

output = scrolledtext.ScrolledText(output_frame, height=12, width=80, state="disabled", font=("Courier", 10))
output.pack()


def show_response(method, url, resp=None, err=None):
    output.config(state="normal")
    output.insert("end", f"\n{method} {url}\n")
    if err:
        output.insert("end", f"Error: {err}\n")
    elif resp is not None:
        output.insert("end", f"Status: {resp.status_code}\n")
        # try to pretty print json
        try:
            body = json.dumps(resp.json(), indent=2)
        except:
            body = resp.text
        output.insert("end", body + "\n")
    output.insert("end", "-" * 60 + "\n")
    output.see("end")
    output.config(state="disabled")


# TABS

notebook = ttk.Notebook(root)
notebook.grid(row=1, column=0, padx=10, pady=4, sticky="ew")


# AUTH TAB

auth_tab = ttk.Frame(notebook, padding=10)
notebook.add(auth_tab, text="Auth")

# register section
reg_frame = ttk.LabelFrame(auth_tab, text="Register", padding=8)
reg_frame.grid(row=0, column=0, sticky="ew", pady=(0,8))

ttk.Label(reg_frame, text="User ID:").grid(row=0, column=0, sticky="w", pady=2)
reg_user = ttk.Entry(reg_frame, width=30)
reg_user.grid(row=0, column=1, padx=6, pady=2)

ttk.Label(reg_frame, text="Password:").grid(row=1, column=0, sticky="w", pady=2)
reg_pass = ttk.Entry(reg_frame, width=30)
reg_pass.grid(row=1, column=1, padx=6, pady=2)

ttk.Label(reg_frame, text="Name:").grid(row=2, column=0, sticky="w", pady=2)
reg_name = ttk.Entry(reg_frame, width=30)
reg_name.grid(row=2, column=1, padx=6, pady=2)


def do_register():
    url = auth_url_entry.get() + "/auth/register"
    data = {
        "userId": reg_user.get(),
        "password": reg_pass.get(),
        "name": reg_name.get()
    }
    try:
        r = requests.post(url, json=data, timeout=10)
        show_response("POST", url, resp=r)
    except Exception as e:
        show_response("POST", url, err=str(e))


ttk.Button(reg_frame, text="Register", command=do_register).grid(row=3, column=1, sticky="e", pady=(6,0))

# login section
login_frame = ttk.LabelFrame(auth_tab, text="Login", padding=8)
login_frame.grid(row=1, column=0, sticky="ew", pady=(0,8))

ttk.Label(login_frame, text="User ID:").grid(row=0, column=0, sticky="w", pady=2)
login_user = ttk.Entry(login_frame, width=30)
login_user.grid(row=0, column=1, padx=6, pady=2)

ttk.Label(login_frame, text="Password:").grid(row=1, column=0, sticky="w", pady=2)
login_pass = ttk.Entry(login_frame, width=30)
login_pass.grid(row=1, column=1, padx=6, pady=2)


def do_login():
    url = auth_url_entry.get() + "/auth/login"
    data = {"userId": login_user.get(), "password": login_pass.get()}
    try:
        r = requests.post(url, json=data, timeout=10)
        show_response("POST", url, resp=r)
        if r.status_code == 200:
            token_display.set(r.json().get("token", ""))
    except Exception as e:
        show_response("POST", url, err=str(e))


ttk.Button(login_frame, text="Login", command=do_login).grid(row=2, column=1, sticky="e", pady=(6,0))


def do_logout():
    url = auth_url_entry.get() + "/auth/logout"
    headers = {"Authorization": f"Bearer {token_display.get()}", "Content-Type": "application/json"}
    try:
        r = requests.post(url, headers=headers, timeout=10)
        show_response("POST", url, resp=r)
    except Exception as e:
        show_response("POST", url, err=str(e))


ttk.Button(auth_tab, text="Logout (clear token)", command=do_logout).grid(row=2, column=0, sticky="w")


# GET TAB

get_tab = ttk.Frame(notebook, padding=10)
notebook.add(get_tab, text="GET Reviews")

# get by movie id
get_movie_frame = ttk.LabelFrame(get_tab, text="GET /movies/{movieId}/reviews", padding=8)
get_movie_frame.grid(row=0, column=0, sticky="ew", pady=(0,8))

ttk.Label(get_movie_frame, text="Movie ID:").grid(row=0, column=0, sticky="w", pady=2)
get_movie_id = ttk.Entry(get_movie_frame, width=30)
get_movie_id.grid(row=0, column=1, padx=6, pady=2)

ttk.Label(get_movie_frame, text="Reviewer (optional):").grid(row=1, column=0, sticky="w", pady=2)
get_reviewer = ttk.Entry(get_movie_frame, width=30)
get_reviewer.grid(row=1, column=1, padx=6, pady=2)


def do_get_reviews():
    movie_id = get_movie_id.get()
    reviewer = get_reviewer.get()
    url = api_url_entry.get() + f"/movies/{movie_id}/reviews"
    if reviewer != "":
        url = url + f"?reviewer={reviewer}"
    try:
        r = requests.get(url, timeout=10)
        show_response("GET", url, resp=r)
    except Exception as e:
        show_response("GET", url, err=str(e))


ttk.Button(get_movie_frame, text="Send", command=do_get_reviews).grid(row=2, column=1, sticky="e", pady=(6,0))

# get by date
get_date_frame = ttk.LabelFrame(get_tab, text="GET /reviews?movie=&published=", padding=8)
get_date_frame.grid(row=1, column=0, sticky="ew")

ttk.Label(get_date_frame, text="Movie ID:").grid(row=0, column=0, sticky="w", pady=2)
date_movie = ttk.Entry(get_date_frame, width=30)
date_movie.grid(row=0, column=1, padx=6, pady=2)

ttk.Label(get_date_frame, text="Published (e.g. 1995-05):").grid(row=1, column=0, sticky="w", pady=2)
date_published = ttk.Entry(get_date_frame, width=30)
date_published.grid(row=1, column=1, padx=6, pady=2)


def do_get_by_date():
    url = api_url_entry.get() + f"/reviews?movie={date_movie.get()}&published={date_published.get()}"
    try:
        r = requests.get(url, timeout=10)
        show_response("GET", url, resp=r)
    except Exception as e:
        show_response("GET", url, err=str(e))


ttk.Button(get_date_frame, text="Send", command=do_get_by_date).grid(row=2, column=1, sticky="e", pady=(6,0))


# POST TAB

post_tab = ttk.Frame(notebook, padding=10)
notebook.add(post_tab, text="POST Review")

post_frame = ttk.LabelFrame(post_tab, text="POST /movies/reviews  (requires token)", padding=8)
post_frame.grid(row=0, column=0, sticky="ew")

ttk.Label(post_frame, text="Movie ID:").grid(row=0, column=0, sticky="w", pady=2)
post_movie_id = ttk.Entry(post_frame, width=30)
post_movie_id.grid(row=0, column=1, padx=6, pady=2)

ttk.Label(post_frame, text="Date (YYYY-MM-DD):").grid(row=1, column=0, sticky="w", pady=2)
post_date = ttk.Entry(post_frame, width=30)
post_date.grid(row=1, column=1, padx=6, pady=2)

ttk.Label(post_frame, text="Review text:").grid(row=2, column=0, sticky="w", pady=2)
post_text = ttk.Entry(post_frame, width=40)
post_text.grid(row=2, column=1, padx=6, pady=2)


def do_post_review():
    url = api_url_entry.get() + "/movies/reviews"
    headers = {"Authorization": f"Bearer {token_display.get()}", "Content-Type": "application/json"}
    data = {"movieId": int(post_movie_id.get()), "date": post_date.get(), "text": post_text.get()}
    try:
        r = requests.post(url, json=data, headers=headers, timeout=10)
        show_response("POST", url, resp=r)
    except Exception as e:
        show_response("POST", url, err=str(e))


ttk.Button(post_frame, text="Send", command=do_post_review).grid(row=3, column=1, sticky="e", pady=(6,0))


# PUT TAB

put_tab = ttk.Frame(notebook, padding=10)
notebook.add(put_tab, text="PUT Review")

put_frame = ttk.LabelFrame(put_tab, text="PUT /movies/{movieId}/reviews  (requires token)", padding=8)
put_frame.grid(row=0, column=0, sticky="ew")

ttk.Label(put_frame, text="Movie ID:").grid(row=0, column=0, sticky="w", pady=2)
put_movie_id = ttk.Entry(put_frame, width=30)
put_movie_id.grid(row=0, column=1, padx=6, pady=2)

ttk.Label(put_frame, text="New review text:").grid(row=1, column=0, sticky="w", pady=2)
put_text = ttk.Entry(put_frame, width=40)
put_text.grid(row=1, column=1, padx=6, pady=2)


def do_put_review():
    movie_id = put_movie_id.get()
    url = api_url_entry.get() + f"/movies/{movie_id}/reviews"
    headers = {"Authorization": f"Bearer {token_display.get()}", "Content-Type": "application/json"}
    data = {"text": put_text.get()}
    try:
        r = requests.put(url, json=data, headers=headers, timeout=10)
        show_response("PUT", url, resp=r)
    except Exception as e:
        show_response("PUT", url, err=str(e))


ttk.Button(put_frame, text="Send", command=do_put_review).grid(row=2, column=1, sticky="e", pady=(6,0))


root.mainloop()
