import Image from 'next/image';
import { FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';

const teamMembers = [
	{
		name: 'Samkit Soni',
		photo: '/lazered.png',
		linkedin: 'https://www.linkedin.com/in/samkit-soni-bab741250/',
		twitter: 'https://x.com/Samkit_Soni12',
		github: 'https://github.com/SamkitSoni',
	},
	{
		name: 'Yug Agarwal',
		photo: '/lazered.png',
		linkedin: 'https://www.linkedin.com/in/yug-agarwal-8b761b255/',
		twitter: 'https://x.com/yugAgarwal29',
		github: 'https://github.com/yug49',
	},
	{
		name: 'Kaushtubh Agrawal',
		photo: '/lazered.png',
		linkedin: 'https://www.linkedin.com/in/kaushtubh-agrawal-650b40229/',
		twitter: 'https://x.com/KaushtubhAgraw1',
		github: 'https://github.com/kaustubh76',
	},
];

export default function MeetTheTeam() {
	return (
		<div className="min-h-screen battlefield-bg relative overflow-hidden">
			<div className="relative z-10 container mx-auto px-6 py-16">
				<h1 className="text-center text-4xl md:text-5xl text-yellow-400 mb-12 tracking-widest arcade-glow" style={{ fontFamily: 'Press Start 2P, monospace' }}>
					Meet the Team
				</h1>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
					{teamMembers.map((member) => (
						<div key={member.name} className="arcade-card p-8 group flex flex-col items-center rounded-2xl">
							<div className="mb-6">
								<div className="weapon-container w-40 h-40 mx-auto rounded-2xl flex items-center justify-center relative overflow-hidden">
									<Image src={member.photo} alt={member.name} width={144} height={144} className="rounded-2xl object-cover" />
									<div className="absolute inset-0 rounded-2xl border-2 border-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
								</div>
							</div>
							<h2 className="text-xl text-yellow-400 mb-2 tracking-wider arcade-glow" style={{ fontFamily: 'Press Start 2P, monospace' }}>
								{member.name}
							</h2>
							<div className="border-t-2 border-yellow-600 pt-3 mb-4 w-full text-center"></div>
							<div className="flex justify-center gap-4 mt-auto text-yellow-400 text-2xl">
								<a href={member.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
									<FaLinkedin />
								</a>
								<a href={member.twitter} target="_blank" rel="noopener noreferrer" title="Twitter">
									<FaTwitter />
								</a>
								<a href={member.github} target="_blank" rel="noopener noreferrer" title="GitHub">
									<FaGithub />
								</a>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
